// Recorrido real de LYNX BarOS en Electron + celular y comensal simulados con Chromium.
// Requiere: npm i -D playwright-core, la app sin datos previos y `npm run build`.
// Linux:   xvfb-run -a node tests/e2e/smoke.mjs
// Windows: node tests/e2e/smoke.mjs   (CHROMIUM_PATH=ruta a chrome.exe para las pruebas de celular)
// OJO: crea un Superadmin "Nacho" en la base de desarrollo (puerto 3000); no usar con datos reales.
import { _electron as electron, chromium } from 'playwright-core';
import fs from 'fs';

const APP = process.env.LYNX_APP_DIR || process.cwd();
const OUT = process.env.SHOTS_DIR || `${APP}/tests/e2e/shots`;
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log('•', ...a);
const results = [];
const check = (cond, msg) => { results.push([!!cond, msg]); console.log(cond ? '  ✓' : '  ✗', msg); };
const api = async (path, { method = 'GET', token, body } = {}) => {
  const r = await fetch('http://127.0.0.1:3001' + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { s: r.status, j };
};

const app = await electron.launch({
  executablePath: process.platform === 'win32' ? `${APP}/node_modules/electron/dist/electron.exe` : `${APP}/node_modules/electron/dist/electron`,
  args: ['--no-sandbox', '--disable-gpu', APP],
  cwd: APP,
  env: { ...process.env, NODE_ENV: 'development', ELECTRON_DISABLE_SECURITY_WARNINGS: '1' },
});
const consoleErrors = [];
const win = await app.firstWindow();
win.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
win.on('pageerror', e => consoleErrors.push('PAGEERROR ' + e.message));
await win.setViewportSize({ width: 1366, height: 820 });
await win.waitForLoadState('domcontentloaded');

// 1) Aislamiento: el renderer no tiene Node
const iso = await win.evaluate(() => ({ require: typeof (window).require, process: typeof (window).process, bridge: typeof (window).lynxIpc }));
check(iso.require === 'undefined' && iso.bridge === 'object', `renderer aislado (require: ${iso.require}, puente IPC: ${iso.bridge})`);

// 2) Primer uso: crear Superadmin
await win.getByText('Primer uso: creá la cuenta Superadmin').waitFor({ timeout: 20000 });
await win.screenshot({ path: `${OUT}/01-primer-uso.png` });
check(true, 'pantalla de primer uso visible');
await win.getByPlaceholder('Usuario o correo del Superadmin').fill('Nacho');
await win.getByPlaceholder('Contraseña (mínimo 8 caracteres)').fill('ClaveSegura!1');
await win.getByPlaceholder('Repetir contraseña').fill('ClaveSegura!1');
await win.getByRole('button', { name: /Crear Superadmin/ }).click();
await win.getByText('Mapa del Salón').first().waitFor({ timeout: 20000 });
await win.waitForTimeout(1500);
await win.screenshot({ path: `${OUT}/02-dashboard.png` });
check(true, 'Superadmin creado y dentro del panel');

// 3) Datos por API (como lo haría un admin desde otro dispositivo)
const login = await api('/api/auth/login', { method: 'POST', body: { name: 'nacho', password: 'ClaveSegura!1' } });
check(login.s === 200 && login.j.user.role === 'Superadmin', 'login por API con el Superadmin creado');
const T = login.j.token;
const p1 = await api('/api/db/products', { method: 'POST', token: T, body: { name: 'Milanesa napolitana', category: 'Comida', price: 9000, takeawayPrice: 9000, stock: 20, sku: 'MIL', unit: 'u', status: 'active', cost: 3000 } });
const p2 = await api('/api/db/products', { method: 'POST', token: T, body: { name: 'Cerveza IPA', category: 'Bebidas', price: 4000, takeawayPrice: 4000, stock: 3, minStock: 6, sku: 'IPA', unit: 'u', status: 'active', cost: 1500 } });
check(p1.s === 200 && p2.s === 200, `productos creados (ids ${p1.j}, ${p2.j})`);
const mozo = await api('/api/db/users', { method: 'POST', token: T, body: { name: 'Juan', role: 'Mozo', pin: 'mozo1234', permissions: ['tables'], status: 'Active' } });
check(mozo.s === 200, 'mozo creado por API (contraseña hasheada en el servidor)');
const users = await api('/api/db/users', { token: T });
check(users.j.every(u => !u.pin && !u.passwordHash), 'la API nunca devuelve contraseñas ni hashes');
const carlos = users.j.find(u => u.name === 'Carlos');
check(!carlos, 'no existe el usuario "Carlos/1234" de antes');

// 4) Sin turno no se cobra; abrir turno
await win.evaluate(() => { location.hash = '#/cierre'; });
await win.waitForTimeout(1500);
await win.screenshot({ path: `${OUT}/03-cierre-sin-turno.png` });
const fondo = win.locator('input[type="number"]').first();
await fondo.fill('10000');
const nameInput = win.locator('input[type="text"]').first();
if (await nameInput.count()) await nameInput.fill('Nacho');
await win.getByRole('button', { name: /Abrir/i }).first().click();
win.once('dialog', d => d.accept());
await win.waitForTimeout(1500);
const shifts = await api('/api/db/shifts', { token: T });
check(shifts.j.some(s => s.status === 'active'), 'turno de caja abierto');

// 5) Mapa: cargar pedido en una mesa y cobrar dividido con propina
await win.evaluate(() => { location.hash = '#/mapa'; });
await win.waitForTimeout(2000);
await win.screenshot({ path: `${OUT}/04-mapa.png` });
const tables = await api('/api/db/salonTables', { token: T });
const tableId = tables.j[0].id;
await api(`/api/db/salonTables/${tableId}`, { method: 'PUT', token: T, body: { status: 'consuming', order: [
  { id: String(p1.j), productId: p1.j, name: 'Milanesa napolitana', price: 9000, qty: 2 },
  { id: String(p2.j), productId: p2.j, name: 'Cerveza IPA', price: 4000, qty: 2 },
] } });
await win.waitForTimeout(1500);
check(true, `pedido cargado en ${tableId}`);

// Abrir la mesa en el mapa y el cobro
await win.getByText(tableId, { exact: true }).first().click({ force: true });
await win.waitForTimeout(800);
await win.screenshot({ path: `${OUT}/05-mesa-pedido.png` });
const cobrar = win.getByRole('button', { name: /Cobrar|COBRAR|Pagar/ }).first();
await cobrar.click();
await win.getByText(`Cobrar Mesa ${tableId}`).waitFor({ timeout: 8000 });
await win.screenshot({ path: `${OUT}/06-cobro.png` });
check(true, 'modal de cobro abierto');
await win.getByRole('button', { name: /Dividir cuenta/ }).click();
await win.getByRole('button', { name: 'Por ítems' }).click();
await win.waitForTimeout(300);
// Parte 1: las 2 milanesas; parte 2: las 2 cervezas
const plus = win.locator('button', { hasText: '+' });
await plus.nth(0).click(); await plus.nth(0).click();   // parte 1, ítem 1 (x2)
await plus.nth(3).click(); await plus.nth(3).click();   // parte 2, ítem 2 (x2)
const tipInputs = win.getByPlaceholder('Propina $');
await tipInputs.nth(0).fill('1800');
await win.locator('select:has(option[value="Tarjeta"])').nth(1).selectOption('Tarjeta');
await win.waitForTimeout(300);
await win.screenshot({ path: `${OUT}/07-cuenta-dividida.png` });
await win.getByRole('button', { name: /COBRAR 2 PARTES/ }).click();
await win.waitForTimeout(2000);
const orders = (await api('/api/db/orders', { token: T })).j.filter(o => o.tableId === tableId);
check(orders.length === 2, `2 órdenes registradas por la cuenta dividida`);
check(orders.map(o => o.total).sort((a, b) => a - b).join(',') === '8000,18000', `montos por parte: ${orders.map(o => o.total).join(' / ')}`);
check(orders.some(o => o.tip === 1800 && o.paymentMethod === 'Efectivo') && orders.some(o => o.paymentMethod === 'Tarjeta'), 'propina y medios de pago por parte');
const prods = (await api('/api/db/products', { token: T })).j;
check(prods.find(p => p.id === p1.j).stock === 18 && prods.find(p => p.id === p2.j).stock === 1, 'stock descontado una sola vez');
const t2 = (await api(`/api/db/salonTables/${tableId}`, { token: T })).j;
check(t2.order.length === 0 && t2.status === 'available', 'mesa liberada');

// 6) Cierre de caja: propinas y totales por medio
await win.evaluate(() => { location.hash = '#/cierre'; });
await win.waitForTimeout(1500);
await win.screenshot({ path: `${OUT}/08-cierre-con-propina.png` });
const cierreText = await win.locator('body').innerText();
check(/Propinas/.test(cierreText), 'el cierre muestra las propinas aparte');

// 7) Reservas
await win.evaluate(() => { location.hash = '#/reservas'; });
await win.waitForTimeout(1000);
await win.getByRole('button', { name: /Nueva/ }).click();
await win.getByPlaceholder('Nombre del cliente').fill('Familia Gómez');
await win.getByPlaceholder('Teléfono').fill('11 5555-1234');
const now = new Date(Date.now() + 60 * 60 * 1000);
await win.locator('input[type="time"]').fill(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
await win.locator('select').first().selectOption(tableId);
await win.getByRole('button', { name: 'Guardar' }).click();
await win.waitForTimeout(1000);
await win.screenshot({ path: `${OUT}/09-reservas.png` });
const res = await api('/api/db/reservations', { token: T });
check(res.j.length === 1 && res.j[0].tableId === tableId, 'reserva guardada y asignada a la mesa');
await win.evaluate(() => { location.hash = '#/mapa'; });
await win.waitForTimeout(1500);
check(/📅/.test(await win.locator('body').innerText()), 'el mapa marca la mesa reservada');
await win.screenshot({ path: `${OUT}/10-mapa-reserva.png` });

// 8) Inventario: alerta y lista de compra
await win.evaluate(() => { location.hash = '#/inventario'; });
await win.waitForTimeout(1500);
await win.getByRole('button', { name: 'Lista de compra' }).click();
await win.waitForTimeout(600);
await win.screenshot({ path: `${OUT}/11-lista-compra.png` });
check(/Cerveza IPA/.test(await win.locator('body').innerText()), 'la cerveza (stock 1, mínimo 6) aparece en la lista de compra');
await win.keyboard.press('Escape');

// 9) Configuración: impresoras y backups
await win.evaluate(() => { location.hash = '#/configuracion'; });
await win.waitForTimeout(1200);
await win.screenshot({ path: `${OUT}/12-config-general.png`, fullPage: true });
await win.getByRole('button', { name: 'Impresoras' }).click();
await win.waitForTimeout(800);
await win.screenshot({ path: `${OUT}/13-impresoras.png` });
check(/Asignaciones/.test(await win.locator('body').innerText()), 'pestaña de impresoras');

// 10) Celular del mozo (Chromium real contra el servidor del local)
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
const phoneErrors = [];
phone.on('pageerror', e => phoneErrors.push(e.message));
await phone.goto('http://127.0.0.1:3001/');
await phone.getByPlaceholder('Usuario o correo electrónico').fill('Juan');
await phone.getByPlaceholder('Contraseña').fill('mozo1234');
await phone.getByRole('button', { name: /Iniciar [sS]esi[oó]n/i }).click();
await phone.getByText(/Mozo/i).first().waitFor({ timeout: 15000 });
await phone.waitForTimeout(2500);
await phone.screenshot({ path: `${OUT}/14-celular-mozo.png` });
check(/CONECTADO/.test(await phone.locator('body').innerText()), 'el celular del mozo se conecta y sincroniza');
const phoneUsers = await phone.evaluate(async () => {
  const dbs = await indexedDB.databases();
  return dbs.map(d => d.name);
});
check(phoneUsers.includes('BarDatabase'), 'el celular tiene su copia local (offline-first)');

// 11) Comensal: carta QR sin login
const guest = await browser.newPage({ viewport: { width: 390, height: 844 } });
await guest.goto(`http://127.0.0.1:3001/#/cliente/${tableId}`);
await guest.getByText('Milanesa napolitana').first().waitFor({ timeout: 15000 });
await guest.screenshot({ path: `${OUT}/15-carta-qr.png` });
check(true, 'la carta QR carga sin login');
const guestApi = await guest.evaluate(async () => (await fetch('/api/db/users')).status);
check(guestApi === 401, `desde la carta QR la API privada responde ${guestApi}`);

await browser.close();
await app.close();

const ok = results.filter(r => r[0]).length;
console.log(`\n${ok}/${results.length} verificaciones OK`);
console.log('Errores de consola (host):', consoleErrors.filter(e => !/Download the React DevTools|favicon/.test(e)).slice(0, 10));
console.log('Errores en el celular:', phoneErrors.slice(0, 5));
