import { getIpc } from './ipc';

/**
 * URL base que pueden abrir otros dispositivos (QR de mesas, celulares de mozos).
 * En la PC principal se pide al proceso de Electron (ngrok o IP de la red local);
 * en un celular/tablet, el origen actual ya es accesible.
 */
export async function getShareableBaseUrl(): Promise<{ url: string; source: 'ngrok' | 'lan' | 'origin' | 'none' }> {
  const ipc = getIpc();
  if (!ipc) return { url: window.location.origin, source: 'origin' };
  try {
    const res = await ipc.invoke<{ url: string | null; source: 'ngrok' | 'lan' | 'none' }>('get-public-base-url');
    if (res?.url) return { url: res.url, source: res.source };
  } catch { /* sin IPC */ }
  return { url: window.location.origin, source: 'none' };
}

export const clientTableUrl = (base: string, tableId: string) => `${base}/#/cliente/${encodeURIComponent(tableId)}`;
