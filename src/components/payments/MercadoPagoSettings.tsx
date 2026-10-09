import { useEffect, useState } from 'react';
import { CheckCircle, QrCode, RefreshCw } from 'lucide-react';
import { getIpc } from '../../lib/ipc';
import { useToast } from '../ui/Toast';

/** Configuración del cobro con QR de Mercado Pago (solo en la PC principal). */
export function MercadoPagoSettings() {
  const { confirm } = useToast();
  const ipc = getIpc();
  const [status, setStatus] = useState<{ configured: boolean; nickname?: string | null; encrypted?: boolean } | null>(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { ipc?.invoke('mp-status').then(setStatus).catch(() => setStatus({ configured: false })); }, []);
  if (!ipc) return null;

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const s = await ipc.invoke('mp-set-token', token);
      setStatus(s); setToken('');
      setMsg({ ok: true, text: `Conectado a la cuenta ${s.nickname}.` });
    } catch (e: any) {
      setMsg({ ok: false, text: (e?.message || 'No se pudo validar el token').replace(/^Error invoking remote method '[^']+': (Error: )?/, '') });
    } finally { setBusy(false); }
  };

  const clear = async () => {
    const ok = await confirm({
      title: 'Desconectar Mercado Pago',
      message: '¿Desconectar Mercado Pago de este sistema?',
      confirmText: 'Desconectar',
      cancelText: 'Cancelar',
      isDestructive: true,
    });
    if (!ok) return;
    setStatus(await ipc.invoke('mp-clear'));
  };

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 mt-6">
      <div>
        <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2"><QrCode className="w-5 h-5 text-sky-600" /> Cobro con Mercado Pago (QR)</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
          Al cobrar una mesa se genera un QR por el monto exacto y el sistema confirma el pago solo.
          Pegá el <b>Access Token de producción</b> de tu aplicación de Mercado Pago (Tus integraciones → Credenciales).
          Se guarda cifrado en esta PC y nunca se envía a los celulares.
        </p>
      </div>
      {status?.configured ? (
        <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-3">
          <span className="text-sm font-bold text-emerald-800 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Conectado{status.nickname ? ` como ${status.nickname}` : ''}{status.encrypted ? '' : ' (sin cifrado del sistema)'}</span>
          <button onClick={clear} className="text-xs font-bold text-rose-600 hover:underline">Desconectar</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="APP_USR-..."
            className="flex-1 h-11 px-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono outline-none focus:border-brand text-slate-900 dark:text-white" />
          <button onClick={save} disabled={busy || token.trim().length < 20}
            className="px-4 h-11 bg-sky-600 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2">
            {busy && <RefreshCw className="w-4 h-4 animate-spin" />} Conectar
          </button>
        </div>
      )}
      {msg && <div className={msg.ok ? 'text-xs font-bold text-emerald-700' : 'text-xs font-bold text-rose-700'}>{msg.text}</div>}
    </div>
  );
}
