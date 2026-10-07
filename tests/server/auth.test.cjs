// Pruebas del servidor local (auth, permisos por rol y carta QR) sin abrir Electron.
// Uso: npm run test:server
process.argv[2] = require('path').resolve(__dirname, '../../electron/main.cjs');
const H = require('./harness.cjs');
const base = 'http://127.0.0.1:3001';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
const req = async (p, { method = 'GET', token, body } = {}) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { s: r.status, j };
};
(async () => {
  await new Promise(r => setTimeout(r, 300));
  H.DB.users.push({ id: 1, name: 'Admin', role: 'Admin', pin: '1234', permissions: [], status: 'Active' },
                  { id: 2, name: 'Juan', role: 'Mozo', pin: '0000', permissions: ['tables'], status: 'Active' });
  H.DB.products.push({ id: 1, name: 'Cerveza', price: 3000, cost: 900, recipe: [], status: 'active', stock: 10, category: 'Bebidas' },
                     { id: 2, name: 'Oculto', price: 1, status: 'inactive', stock: 1 });
  H.DB.salonTables.push({ id: 'T-1', status: 'available', order: [{ id: 'a', name: 'Cerveza', price: 3000, qty: 1 }], x: 0, y: 0 });
  H.DB.expenses.push({ id: 1, provider: 'X', amount: 100 });

  console.log('Sin sesión');
  ok((await req('/api/db/users')).s === 401, 'GET users sin token -> 401');
  ok((await req('/api/db/orders/1', { method: 'DELETE' })).s === 401, 'DELETE sin token -> 401');
  ok((await req('/api/sync-info')).s === 401, 'sync-info sin token -> 401');

  console.log('Login y migración');
  ok((await req('/api/auth/login', { method: 'POST', body: { name: 'juan', password: 'mal' } })).s === 401, 'contraseña incorrecta -> 401');
  const lj = await req('/api/auth/login', { method: 'POST', body: { name: 'JUAN', password: '0000' } });
  ok(lj.s === 200 && lj.j.token, 'login mozo OK (case-insensitive)');
  ok(H.DB.users[1].pin === '' && H.DB.users[1].passwordHash?.startsWith('scrypt$'), 'pin plano migrado a hash');
  ok(!('pin' in lj.j.user) && !('passwordHash' in lj.j.user), 'respuesta de login sin secretos');
  ok((await req('/api/auth/login', { method: 'POST', body: { name: 'Juan', password: '0000' } })).s === 200, 'login con hash migrado OK');
  const tj = lj.j.token;

  console.log('Permisos mozo');
  ok((await req('/api/db/users', { token: tj })).s === 403, 'mozo GET users -> 403');
  ok((await req('/api/db/expenses', { token: tj })).s === 403, 'mozo GET expenses -> 403');
  ok((await req('/api/db/products', { token: tj })).s === 200, 'mozo GET products -> 200');
  ok((await req('/api/db/orders', { method: 'POST', token: tj, body: { tableId: 'T-1', items: [], total: 0 } })).s === 200, 'mozo POST orders -> 200');
  ok((await req('/api/db/orders/1', { method: 'DELETE', token: tj })).s === 403, 'mozo DELETE orders -> 403');
  ok((await req('/api/db/inventadaXYZ', { token: tj })).s === 403, 'tabla desconocida -> 403');
  ok((await req('/api/db/reservations', { method: 'POST', token: tj, body: { customerName: 'Gómez', partySize: 4, date: '2026-10-10T21:00:00Z', status: 'confirmed' } })).s === 200, 'mozo puede cargar reservas');
  ok((await req('/api/db/reservations/1', { method: 'DELETE', token: tj })).s === 403, 'mozo no puede borrar reservas');
  ok((await req('/api/print', { method: 'POST', token: tj, body: { target: 'otra', lines: [] } })).s === 400, 'impresión: destino inválido rechazado');
  ok((await req('/api/print', { method: 'POST', body: { target: 'ticket', lines: [{ text: 'x' }] } })).s === 401, 'impresión sin sesión -> 401');
  ok((await req('/api/mp/qr', { method: 'POST', body: { amount: 10 } })).s === 401, 'Mercado Pago sin sesión -> 401');
  const me = await req('/api/auth/me', { token: tj });
  ok(me.s === 200 && me.j.allowedTables.includes('products') && !me.j.allowedTables.includes('users'), '/me devuelve tablas permitidas');

  console.log('Admin');
  const la = await req('/api/auth/login', { method: 'POST', body: { name: 'Admin', password: '1234' } });
  const ta = la.j.token;
  const us = await req('/api/db/users', { token: ta });
  ok(us.s === 200 && us.j.every(u => !('pin' in u) && !('passwordHash' in u)), 'admin GET users sin secretos');
  ok((await req('/api/db/users', { method: 'POST', token: ta, body: { name: 'Root', role: 'Superadmin', pin: 'x' } })).s === 403, 'admin no puede crear Superadmin');
  const cu = await req('/api/db/users', { method: 'POST', token: ta, body: { name: 'Ana', role: 'Cajero', pin: 'clave123', passwordHash: 'scrypt$hack' } });
  const ana = H.DB.users.find(u => u.name === 'Ana');
  ok(cu.s === 200 && ana.pin === '' && ana.passwordHash.startsWith('scrypt$16384'), 'alta de usuario hashea en servidor e ignora hash del cliente');
  ok((await req('/api/auth/login', { method: 'POST', body: { name: 'Ana', password: 'clave123' } })).s === 200, 'login usuario nuevo OK');
  await req('/api/db/users/2', { method: 'PUT', token: ta, body: { status: 'Inactive' } });
  ok((await req('/api/db/products', { token: tj })).s === 401, 'mozo desactivado pierde la sesión');
  ok(H.DB.users[1].passwordHash, 'PUT sin pin conserva la contraseña');

  console.log('Carta QR pública');
  const menu = await req('/api/public/menu');
  ok(menu.s === 200 && menu.j.length === 1 && !('cost' in menu.j[0]) && !('recipe' in menu.j[0]), 'menú público sin costos ni inactivos');
  const tb = await req('/api/public/table/T-1');
  ok(tb.s === 200 && tb.j.table.id === 'T-1' && Array.isArray(tb.j.clientOrders), 'estado de mesa público');
  ok((await req('/api/public/table/NOPE')).s === 404, 'mesa inexistente -> 404');
  const po = await req('/api/public/client-orders', { method: 'POST', body: { tableId: 'T-1', customerId: 'c1', items: [{ id: '1', name: 'Cerveza', price: 1, qty: 2 }], total: 2 } });
  const co = H.DB.clientOrders[0];
  ok(po.s === 200 && co.total === 6000 && co.items[0].price === 3000 && co.status === 'pending', 'precio manipulado se recalcula del catálogo');
  ok((await req('/api/public/client-orders', { method: 'POST', body: { tableId: 'T-1', customerId: 'c1', items: [{ id: '2', qty: 1 }] } })).s === 400, 'producto inactivo rechazado');
  ok((await req('/api/public/client-orders', { method: 'POST', body: { tableId: 'T-1', customerId: 'c1', items: [{ id: '1', qty: 999 }] } })).s === 400, 'cantidad absurda rechazada');

  console.log('Setup Superadmin (IPC)');
  ok(await H.invoke('auth-needs-setup') === true, 'sin superadmin -> needs-setup true');
  ok((await H.invoke('auth-setup-superadmin', { name: 'Nacho', password: 'corta' })).ok === false, 'contraseña corta rechazada');
  const su = await H.invoke('auth-setup-superadmin', { name: 'Nacho', password: 'unaClaveLarga!' });
  ok(su.ok && su.user.role === 'Superadmin' && su.token, 'superadmin creado y logueado');
  ok(await H.invoke('auth-needs-setup') === false, 'needs-setup pasa a false');
  ok((await H.invoke('auth-setup-superadmin', { name: 'Otro', password: 'unaClaveLarga!' })).ok === false, 'no se puede crear un segundo superadmin por setup');
  let blocked = false;
  try { await H.handlers['auth-me']({ sender: {} }, su.token); } catch { blocked = true; }
  ok(blocked, 'IPC desde otro origen rechazado');

  console.log('Rate limit');
  let last;
  for (let i = 0; i < 11; i++) last = await req('/api/auth/login', { method: 'POST', body: { name: 'Admin', password: 'mal' } });
  ok(last.s === 429, 'fuerza bruta -> 429');

  console.log(`\n${pass} OK, ${fail} fallidos`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
