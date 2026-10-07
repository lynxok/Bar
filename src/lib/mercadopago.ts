// Cobro con QR de Mercado Pago. El token vive solo en la PC principal:
// en el host se usa IPC; en celulares/tablets, la API del host.
import { getIpc } from './ipc';
import { apiFetch } from './auth';

export interface MpQr { preferenceId: string; url: string; reference: string; amount: number; expiresAt: string; }
export interface MpCheck { status: 'approved' | 'pending' | 'rejected' | 'cancelled' | 'amount_mismatch' | string; paymentId?: string | null; amount?: number; expected?: number; }

export const newPaymentReference = (tableId: string) =>
  `LYNX-${tableId.replace(/[^A-Za-z0-9]/g, '').slice(0, 12)}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function mpIsConfigured(): Promise<boolean> {
  const ipc = getIpc();
  try {
    if (ipc) return (await ipc.invoke<{ configured: boolean }>('mp-status')).configured;
    return (await apiFetch<{ configured: boolean }>('/api/mp/status')).configured;
  } catch { return false; }
}

export async function mpCreateQr(amount: number, description: string, reference: string): Promise<MpQr> {
  const ipc = getIpc();
  if (ipc) return ipc.invoke<MpQr>('mp-create-qr', { amount, description, reference });
  return apiFetch<MpQr>('/api/mp/qr', { method: 'POST', body: JSON.stringify({ amount, description, reference }) });
}

export async function mpCheck(reference: string, amount: number): Promise<MpCheck> {
  const ipc = getIpc();
  if (ipc) return ipc.invoke<MpCheck>('mp-check', { reference, amount });
  return apiFetch<MpCheck>(`/api/mp/check/${encodeURIComponent(reference)}?amount=${amount}`);
}
