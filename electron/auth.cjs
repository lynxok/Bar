// Autenticación y autorización del servidor local de LYNX BarOS.
// - Contraseñas: scrypt con salt aleatorio (sin dependencias externas).
// - Sesiones: token aleatorio persistido en userData/sessions.json con expiración deslizante.
// - Autorización: allowlist de tablas y operaciones por rol.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días, se renueva con el uso
const SCRYPT_N = 16384, SCRYPT_R = 8, SCRYPT_P = 1, KEYLEN = 64;

// ---------- Contraseñas ----------
function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) throw new Error('Contraseña vacía');
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(password, stored) {
  try {
    if (typeof password !== 'string' || typeof stored !== 'string') return false;
    const [algo, n, r, p, saltB64, hashB64] = stored.split('$');
    if (algo !== 'scrypt') return false;
    const expected = Buffer.from(hashB64, 'base64');
    const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, { N: +n, r: +r, p: +p });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function safeEqualPlain(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// ---------- Roles y permisos ----------
// Letras: r = leer (GET), c = crear (POST), u = actualizar (PUT), d = borrar (DELETE)
const ALL = 'rcud';
const LOGS_WRITE = 'c';
const ROLE_RULES = {
  superadmin: '*',
  admin: '*',
  cajero: {
    products: 'rcu', orders: 'rcu', expenses: 'rcu', salonTables: ALL, paymentOrders: 'rcu',
    comandas: ALL, rewards: 'r', customers: 'rcu', shifts: 'rcu', messages: ALL,
    floorPlans: 'r', loyaltyConfig: 'r', loyaltyTransactions: 'rc', clientOrders: ALL,
    billingDrafts: 'rcu', reservations: ALL, systemLogs: LOGS_WRITE, auditLogs: LOGS_WRITE,
  },
  mozo: {
    products: 'ru', orders: 'rc', salonTables: 'rcu', comandas: 'rcu', rewards: 'r',
    customers: 'rcu', shifts: 'r', messages: 'rcu', floorPlans: 'r', loyaltyConfig: 'r',
    loyaltyTransactions: 'rc', clientOrders: 'rcu', billingDrafts: 'c', reservations: 'rcu',
    systemLogs: LOGS_WRITE, auditLogs: LOGS_WRITE,
  },
  cocinero: {
    products: 'ru', comandas: 'ru', salonTables: 'ru', messages: 'rcu', shifts: 'r',
    systemLogs: LOGS_WRITE, auditLogs: LOGS_WRITE,
  },
};

const KNOWN_TABLES = [
  'products', 'orders', 'expenses', 'config', 'salonTables', 'paymentOrders', 'systemLogs',
  'auditLogs', 'comandas', 'rewards', 'customers', 'shifts', 'users', 'messages', 'floorPlans',
  'loyaltyConfig', 'loyaltyTransactions', 'clientOrders', 'billingDrafts', 'reservations',
];

const METHOD_LETTER = { GET: 'r', POST: 'c', PUT: 'u', PATCH: 'u', DELETE: 'd' };

function normalizeRole(role) {
  const r = String(role || '').toLowerCase().trim();
  return ROLE_RULES[r] ? r : 'mozo';
}

function isAdminRole(role) {
  const r = normalizeRole(role);
  return r === 'admin' || r === 'superadmin';
}

function canAccess(role, table, method) {
  if (!KNOWN_TABLES.includes(table)) return false;
  const rules = ROLE_RULES[normalizeRole(role)];
  if (rules === '*') return true;
  const letter = METHOD_LETTER[String(method).toUpperCase()];
  return !!(letter && rules[table] && rules[table].includes(letter));
}

function readableTables(role) {
  return KNOWN_TABLES.filter(t => canAccess(role, t, 'GET'));
}

// Quita secretos de un usuario antes de enviarlo a cualquier cliente
function publicUser(u) {
  if (!u) return u;
  const { pin, passwordHash, ...rest } = u;
  return rest;
}

// ---------- Sesiones ----------
function createSessionStore(userDataPath) {
  const file = path.join(userDataPath, 'sessions.json');
  let sessions = new Map();
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const now = Date.now();
    for (const [token, s] of Object.entries(raw)) if (s.exp > now) sessions.set(token, s);
  } catch { /* primera ejecución */ }

  let saveTimer = null;
  const persist = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { fs.writeFileSync(file, JSON.stringify(Object.fromEntries(sessions)), { mode: 0o600 }); } catch (e) { console.error('No se pudo guardar sessions.json', e); }
    }, 500);
  };

  return {
    create(user) {
      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, {
        user: { id: user.id, name: user.name, role: user.role, permissions: user.permissions || [] },
        exp: Date.now() + SESSION_TTL_MS,
      });
      persist();
      return token;
    },
    get(token) {
      if (!token || typeof token !== 'string') return null;
      const s = sessions.get(token);
      if (!s) return null;
      if (s.exp < Date.now()) { sessions.delete(token); persist(); return null; }
      // Expiración deslizante (se renueva como máximo una vez por hora)
      if (s.exp - Date.now() < SESSION_TTL_MS - 60 * 60 * 1000) { s.exp = Date.now() + SESSION_TTL_MS; persist(); }
      return s;
    },
    revoke(token) { if (sessions.delete(token)) persist(); },
    revokeUser(userId) {
      let changed = false;
      for (const [t, s] of sessions) if (String(s.user.id) === String(userId)) { sessions.delete(t); changed = true; }
      if (changed) persist();
    },
    updateUser(user) {
      let changed = false;
      for (const s of sessions.values()) {
        if (String(s.user.id) === String(user.id)) {
          s.user = { id: user.id, name: user.name, role: user.role, permissions: user.permissions || [] };
          changed = true;
        }
      }
      if (changed) persist();
    },
  };
}

// ---------- Rate limit simple en memoria ----------
function createRateLimiter(max, windowMs) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
    if (arr.length >= max) { hits.set(key, arr); return false; }
    arr.push(now);
    hits.set(key, arr);
    if (hits.size > 5000) hits.clear();
    return true;
  };
}

module.exports = {
  hashPassword, verifyPassword, safeEqualPlain,
  canAccess, readableTables, isAdminRole, normalizeRole, publicUser,
  createSessionStore, createRateLimiter, KNOWN_TABLES,
};
