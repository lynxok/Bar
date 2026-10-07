// PC principal simulada: Dexie real (fake-indexeddb) + electron/main.cjs real con Electron mockeado
import { setupBrowserGlobals } from './common.ts';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';
import http from 'http';
import os from 'os'; import fs from 'fs'; import path from 'path';
setupBrowserGlobals('http://127.0.0.1:3001', '#/');
const require = createRequire(import.meta.url);
const Module = require('module');

const ipcMain: any = new EventEmitter(); const handlers: Record<string, Function> = {};
ipcMain.handle = (ch: string, fn: Function) => { handlers[ch] = fn; };
const rendererListeners: Record<string, Function[]> = {};
const webContents = { send: (ch: string, payload: any) => setImmediate(() => (rendererListeners[ch] || []).forEach(fn => fn({}, payload))) };
(globalThis as any).window.lynxIpc = {
  send: (ch: string, data: any) => setImmediate(() => ipcMain.emit(ch, { sender: webContents }, data)),
  invoke: (ch: string, arg: any) => handlers[ch]({ sender: webContents }, arg),
  sendSync: () => '0.0.0',
  on: (ch: string, fn: Function) => { (rendererListeners[ch] ||= []).push(fn); },
  removeListener() {}, removeAllListeners() {},
};
class BrowserWindow { webContents = webContents; loadURL() {} isDestroyed() { return false; } on() {} static getAllWindows() { return []; } }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lynx-host-'));
const mocks: any = {
  electron: { app: { getPath: () => tmp, isPackaged: false, whenReady: () => Promise.resolve(), on() {}, getVersion: () => '0.0.0', quit() {} }, BrowserWindow, ipcMain, shell: {}, dialog: {} },
  'electron-updater': { autoUpdater: Object.assign(new EventEmitter(), { checkForUpdatesAndNotify() {}, checkForUpdates() {} }) },
  'afip.ts': { Afip: class {} },
};
const orig = Module._load;
Module._load = function (req: string, ...a: any[]) { return mocks[req] || orig.call(this, req, ...a); };

const { db } = await import('../../src/db/database.ts');
await db.open();
await db.users.bulkAdd([
  { name: 'Admin', role: 'Admin', pin: 'admin1', permissions: [], status: 'Active' } as any,
  { name: 'Juan', role: 'Mozo', pin: '0000', permissions: [], status: 'Active' } as any,
]);
await db.products.bulkAdd([
  { name: 'Cerveza', price: 3000, stock: 50, status: 'active', category: 'Bebidas', sku: 'c', unit: 'u', takeawayPrice: 0, popular: false } as any,
  { name: 'Papas', price: 2000, stock: 30, status: 'active', category: 'Comida', sku: 'p', unit: 'u', takeawayPrice: 0, popular: false } as any,
]);
await db.salonTables.add({ id: 'T-1', status: 'available', order: [], lastUpdate: '', x: 0, y: 0, type: 'square', width: 1, height: 1, capacity: 4 } as any);
await db.orders.bulkAdd([{ tableId: 'X', items: [], total: 1, status: 'closed', timestamp: 'a' } as any, { tableId: 'X', items: [], total: 2, status: 'closed', timestamp: 'b' } as any]);
require(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../electron/main.cjs'));

// Servidor de control para que el proceso "celular" ordene acciones en el host
http.createServer(async (req, res) => {
  const url = new URL(req.url!, 'http://x');
  let out: any = null;
  try {
    const act = url.pathname.slice(1);
    if (act === 'deleteProduct') { await db.products.delete(Number(url.searchParams.get('id'))); out = 'ok'; }
    else if (act === 'updateProduct') { await db.products.update(Number(url.searchParams.get('id')), { price: Number(url.searchParams.get('price')) }); out = 'ok'; }
    else if (act === 'orders') out = await db.orders.toArray();
    else if (act === 'product') out = await db.products.get(Number(url.searchParams.get('id')));
    else if (act === 'tombstones') out = await db.tombstones.toArray();
    else if (act === 'backupRoundtrip') {
      const bk = await import('../../src/lib/backup.ts');
      const json = await bk.buildBackupJson();
      await db.products.update(2, { price: 999999 });
      await db.customers.add({ dni: '1', name: 'Temporal', points: 0 } as any);
      await bk.restoreBackupJson(json);
      const list = await bk.listBackups();
      out = { price: (await db.products.get(2))?.price, customers: await db.customers.count(), tombstones: await db.tombstones.count(), backups: list.map(b => b.name) };
    }
  } catch (e: any) { out = { error: e.message }; }
  res.end(JSON.stringify(out));
}).listen(3999, () => console.log('HOST LISTO'));
