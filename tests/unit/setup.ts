// IndexedDB en memoria y puente IPC simulado: los tests corren en "modo PC principal".
import 'fake-indexeddb/auto';

const sent: { channel: string; args: unknown[] }[] = [];
(window as any).lynxIpc = {
  send: (channel: string, ...args: unknown[]) => { sent.push({ channel, args }); },
  sendSync: () => '0.0.0-test',
  invoke: async () => null,
  on: () => {},
  removeListener: () => {},
  removeAllListeners: () => {},
};
(globalThis as any).__ipcSent = sent;
