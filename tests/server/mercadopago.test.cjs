// Pruebas del módulo de Mercado Pago con la API simulada (sin red).
const os = require('os'), fs = require('fs'), path = require('path');
const { createMercadoPago } = require('../../electron/mercadopago.cjs');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-'));
const safeStorage = { isEncryptionAvailable: () => true, encryptString: s => Buffer.from('ENC:' + s), decryptString: b => b.toString().slice(4) };
const calls = [];
let payments = [];
const fakeFetch = async (url, opts = {}) => {
  calls.push({ url, opts });
  const auth = (opts.headers || {}).Authorization;
  const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
  if (auth !== 'Bearer APP_USR-valid-token-1234567890') return json(401, { message: 'invalid access token' });
  if (url.endsWith('/users/me')) return json(200, { id: 1, nickname: 'BAR_TEST' });
  if (url.endsWith('/checkout/preferences')) return json(201, { id: 'pref_1', init_point: 'https://mpago.la/abc' });
  if (url.includes('/v1/payments/search')) return json(200, { results: payments });
  return json(404, {});
};
(async () => {
  const mp = createMercadoPago({ userDataPath: tmp, safeStorage, fetchImpl: fakeFetch });
  ok((await mp.status()).configured === false, 'arranca sin configurar');
  let err = null; try { await mp.createQr({ amount: 100, reference: 'ref123456' }); } catch (e) { err = e; }
  ok(err && /no está configurado/.test(err.message), 'sin token no cobra');
  err = null; try { await mp.setToken('APP_USR-malo-0000000000000'); } catch (e) { err = e; }
  ok(err && /invalid/.test(err.message), 'token inválido rechazado antes de guardar');
  const st = await mp.setToken('APP_USR-valid-token-1234567890');
  ok(st.configured && st.nickname === 'BAR_TEST' && st.encrypted, 'token válido guardado cifrado');
  const raw = fs.readFileSync(path.join(tmp, 'mercadopago.json'), 'utf8');
  ok(!raw.includes('valid-token'), 'el archivo no contiene el token en claro');
  const qr = await mp.createQr({ amount: 1234.567, description: 'Mesa 5', reference: 'LYNX-T5-abc123' });
  const prefBody = JSON.parse(calls.find(c => c.url.endsWith('/checkout/preferences')).opts.body);
  ok(qr.url === 'https://mpago.la/abc' && prefBody.items[0].unit_price === 1234.57 && prefBody.external_reference === 'LYNX-T5-abc123', 'crea la preferencia con monto redondeado y referencia');
  ok(calls.find(c => c.url.endsWith('/checkout/preferences')).opts.headers['X-Idempotency-Key'] === 'LYNX-T5-abc123', 'usa clave de idempotencia');
  err = null; try { await mp.createQr({ amount: 10, reference: 'x' }); } catch (e) { err = e; }
  ok(err, 'referencia inválida rechazada');
  payments = [];
  ok((await mp.check({ reference: 'LYNX-T5-abc123', amount: 1234.57 })).status === 'pending', 'sin pagos -> pending');
  payments = [{ id: 99, status: 'rejected', transaction_amount: 1234.57 }];
  ok((await mp.check({ reference: 'LYNX-T5-abc123', amount: 1234.57 })).status === 'rejected', 'pago rechazado se informa');
  payments = [{ id: 100, status: 'approved', transaction_amount: 1000 }];
  ok((await mp.check({ reference: 'LYNX-T5-abc123', amount: 1234.57 })).status === 'amount_mismatch', 'monto menor -> amount_mismatch');
  payments = [{ id: 101, status: 'approved', transaction_amount: 1234.57 }];
  const c = await mp.check({ reference: 'LYNX-T5-abc123', amount: 1234.57 });
  ok(c.status === 'approved' && c.paymentId === '101', 'pago aprobado conciliado');
  console.log(`\n${pass} OK, ${fail} fallidos`);
  process.exit(fail ? 1 : 0);
})();
