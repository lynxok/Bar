const Module = require('module');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { EventEmitter } = require('events');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lynx-'));

// ---- DB en memoria que imita el handler del renderer ----
const DB = { users: [], products: [], salonTables: [], clientOrders: [], orders: [], expenses: [], reservations: [] };
const seq = {};
function handle({ table, id, method, body, query }) {
  const t = DB[table]; if (!t) throw new Error(`Table ${table} not found`);
  const key = id ? (isNaN(Number(id)) ? id : Number(id)) : null;
  if (method === 'GET') {
    if (key !== null) return t.find(r => r.id === key);
    if (query && query.where) return t.filter(r => String(r[query.where]) === String(query.equals));
    return t;
  }
  if (method === 'POST') { const r = { ...body }; if (r.id == null) { seq[table] = (seq[table] || t.length) + 1; r.id = seq[table]; } t.push(r); return r.id; }
  if (method === 'PUT') { const r = t.find(x => x.id === key); if (!r) return 0; Object.assign(r, body); return 1; }
  if (method === 'DELETE') { const i = t.findIndex(x => x.id === key); if (i >= 0) t.splice(i, 1); return undefined; }
}
const ipcMain = new EventEmitter(); const handlers = {};
ipcMain.handle = (ch, fn) => { handlers[ch] = fn; };
let webContents;
class BrowserWindow { constructor() { this.webContents = webContents = { send: (ch, p) => {
  if (ch !== 'db-request') return;
  setImmediate(() => { try { const data = handle(p); ipcMain.emit('db-response', { sender: webContents }, { requestId: p.requestId, success: true, data: data && JSON.parse(JSON.stringify(data)) }); }
  catch (e) { ipcMain.emit('db-response', { sender: webContents }, { requestId: p.requestId, success: false, error: e.message }); } });
} }; } loadURL() {} isDestroyed() { return false; } on() {} static getAllWindows() { return []; } }
const app = { getPath: () => tmp, isPackaged: false, whenReady: () => Promise.resolve(), on() {}, getVersion: () => '0.0.0', quit() {} };
const mocks = {
  electron: { app, BrowserWindow, ipcMain, shell: {}, dialog: {} },
  'electron-updater': { autoUpdater: Object.assign(new EventEmitter(), { checkForUpdatesAndNotify() {}, checkForUpdates() {} }) },
  'afip.ts': { Afip: class {} },
};
const orig = Module._load;
Module._load = function (req, ...a) { return mocks[req] || orig.call(this, req, ...a); };
module.exports = { DB, handlers, invoke: (ch, arg) => handlers[ch]({ sender: webContents }, arg) };
require(process.argv[2]);
