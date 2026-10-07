// IndexedDB en memoria y puente IPC simulado: los tests corren en "modo PC principal".
import 'fake-indexeddb/auto';

// Polyfill seguro de localStorage en Node >= 22 / jsdom
if (!window.localStorage || typeof window.localStorage.clear !== 'function') {
  let store: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() { return Object.keys(store).length; },
  };
  Object.defineProperty(window, 'localStorage', { value: mockStorage, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, configurable: true, writable: true });
}

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

