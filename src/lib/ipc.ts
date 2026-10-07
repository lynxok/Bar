// Acceso al puente IPC expuesto por electron/preload.cjs.
// Devuelve null fuera de Electron (celulares/tablets conectados por red).
export interface LynxIpc {
  send: (channel: string, ...args: any[]) => void;
  sendSync: (channel: string, ...args: any[]) => any;
  invoke: <T = any>(channel: string, ...args: any[]) => Promise<T>;
  on: (channel: string, listener: (event: unknown, ...args: any[]) => void) => void;
  removeListener: (channel: string, listener: (event: unknown, ...args: any[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

export function getIpc(): LynxIpc | null {
  return ((window as any).lynxIpc as LynxIpc | undefined) ?? null;
}
