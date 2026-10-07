// Puente seguro entre el renderer y el proceso principal (contextIsolation activo).
// Solo expone los canales IPC que la app usa realmente.
const { contextBridge, ipcRenderer } = require('electron');

const SEND = ['db-response', 'db-changed', 'set-supabase-config', 'check-update', 'start-download', 'apply-update'];
const SEND_SYNC = ['get-app-version'];
const INVOKE = [
  'arca-generate-invoice', 'arca-regenerate-pdf', 'arca-test-connection', 'arca-generate-csr',
  'open-file-path', 'start-ngrok', 'stop-ngrok', 'get-ngrok-status',
  'auth-login', 'auth-me', 'auth-logout', 'auth-needs-setup', 'auth-setup-superadmin', 'auth-hash-password', 'auth-user-changed',
  'get-public-base-url',
  'printer-config-get', 'printer-config-set', 'printers-list', 'print-lines',
  'mp-status', 'mp-set-token', 'mp-clear', 'mp-create-qr', 'mp-check',
  'backup-write', 'backup-list', 'backup-read', 'backup-export', 'backup-import-dialog', 'backup-open-folder',
];
const ON = ['db-request', 'update-available', 'update-not-available', 'download-progress', 'update-downloaded', 'update-error'];

const check = (list, channel) => {
  if (!list.includes(channel)) throw new Error(`Canal IPC no permitido: ${channel}`);
};

// listener original -> wrapper, para poder removerlos
const wrappers = new Map();

contextBridge.exposeInMainWorld('lynxIpc', {
  send: (channel, ...args) => { check(SEND, channel); ipcRenderer.send(channel, ...args); },
  sendSync: (channel, ...args) => { check(SEND_SYNC, channel); return ipcRenderer.sendSync(channel, ...args); },
  invoke: (channel, ...args) => { check(INVOKE, channel); return ipcRenderer.invoke(channel, ...args); },
  on: (channel, listener) => {
    check(ON, channel);
    const wrapper = (_event, ...args) => listener({}, ...args);
    if (!wrappers.has(channel)) wrappers.set(channel, new Map());
    wrappers.get(channel).set(listener, wrapper);
    ipcRenderer.on(channel, wrapper);
  },
  removeListener: (channel, listener) => {
    check(ON, channel);
    const w = wrappers.get(channel)?.get(listener);
    if (w) { ipcRenderer.removeListener(channel, w); wrappers.get(channel).delete(listener); }
  },
  removeAllListeners: (channel) => {
    check(ON, channel);
    ipcRenderer.removeAllListeners(channel);
    wrappers.delete(channel);
  },
});
