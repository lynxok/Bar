// Cobro con QR de Mercado Pago y conciliación automática.
// - El access token se guarda cifrado con safeStorage (DPAPI en Windows) en userData.
// - Se crea una preferencia de pago con external_reference único; el QR apunta al init_point.
// - La conciliación busca pagos aprobados con esa referencia y valida el monto.
const fs = require('fs');
const path = require('path');

const API = 'https://api.mercadopago.com';

function createMercadoPago({ userDataPath, safeStorage, fetchImpl }) {
  const file = path.join(userDataPath, 'mercadopago.json');
  const doFetch = fetchImpl || ((...a) => fetch(...a));

  const readConfig = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; } };
  const writeConfig = (c) => fs.writeFileSync(file, JSON.stringify(c), { mode: 0o600 });

  function getToken() {
    const c = readConfig();
    if (c.tokenEnc && safeStorage && safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(c.tokenEnc, 'base64'));
    }
    return c.tokenPlain || null;
  }

  async function call(method, urlPath, body, idempotencyKey) {
    const token = getToken();
    if (!token) throw Object.assign(new Error('Mercado Pago no está configurado. Cargá el Access Token en Configuración.'), { status: 400 });
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;
    const res = await doFetch(`${API}${urlPath}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || data.error || `Error ${res.status} de Mercado Pago`;
      throw Object.assign(new Error(msg), { status: res.status === 401 ? 400 : 502 });
    }
    return data;
  }

  return {
    async status() {
      const c = readConfig();
      return { configured: !!getToken(), nickname: c.nickname || null, encrypted: !!c.tokenEnc };
    },

    async setToken(token) {
      if (typeof token !== 'string' || token.trim().length < 20) throw new Error('Token inválido');
      const t = token.trim();
      // Validar contra la API antes de guardar
      const res = await doFetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${t}` } });
      const me = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(me.message || 'Mercado Pago rechazó el token');
      const c = { nickname: me.nickname || String(me.id || '') };
      if (safeStorage && safeStorage.isEncryptionAvailable()) c.tokenEnc = safeStorage.encryptString(t).toString('base64');
      else c.tokenPlain = t;
      writeConfig(c);
      return { configured: true, nickname: c.nickname, encrypted: !!c.tokenEnc };
    },

    clear() { writeConfig({}); return { configured: false }; },

    /** Crea el cobro. Devuelve la URL que se muestra como QR. */
    async createQr({ amount, description, reference }) {
      const value = Math.round(Number(amount) * 100) / 100;
      if (!(value > 0)) throw Object.assign(new Error('Monto inválido'), { status: 400 });
      if (typeof reference !== 'string' || !/^[A-Za-z0-9_-]{6,64}$/.test(reference)) throw Object.assign(new Error('Referencia inválida'), { status: 400 });
      const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const pref = await call('POST', '/checkout/preferences', {
        items: [{ title: String(description || 'Consumo').slice(0, 120), quantity: 1, unit_price: value, currency_id: 'ARS' }],
        external_reference: reference,
        expires: true,
        expiration_date_to: expires,
        payment_methods: { installments: 1 },
      }, reference);
      return { preferenceId: pref.id, url: pref.init_point, reference, amount: value, expiresAt: expires };
    },

    /** Busca un pago aprobado con esa referencia y verifica el monto. */
    async check({ reference, amount }) {
      if (typeof reference !== 'string' || !/^[A-Za-z0-9_-]{6,64}$/.test(reference)) throw Object.assign(new Error('Referencia inválida'), { status: 400 });
      const data = await call('GET', `/v1/payments/search?external_reference=${encodeURIComponent(reference)}&sort=date_created&criteria=desc`);
      const results = Array.isArray(data.results) ? data.results : [];
      const approved = results.find(p => p.status === 'approved');
      if (approved) {
        const paid = Number(approved.transaction_amount) || 0;
        const expected = Math.round(Number(amount) * 100) / 100;
        if (expected && paid + 0.009 < expected) {
          return { status: 'amount_mismatch', paymentId: String(approved.id), amount: paid, expected };
        }
        return { status: 'approved', paymentId: String(approved.id), amount: paid };
      }
      const last = results[0];
      return { status: last ? last.status : 'pending', paymentId: last ? String(last.id) : null };
    },
  };
}

module.exports = { createMercadoPago };
