import { useEffect, useState } from 'react';
import { isHost, onOutboxChange, db } from '../db/database';
import { getSyncConnected, onSyncStateChange } from '../services/syncService';
import { cn } from '../lib/utils';

/** Estado de conexión con la PC principal y cambios pendientes de enviar (solo en celulares/tablets). */
export function SyncStatusBadge({ className }: { className?: string }) {
  const [connected, setConnected] = useState(getSyncConnected());
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (isHost) return;
    db.outbox.count().then(setPending).catch(() => {});
    const offSync = onSyncStateChange(setConnected);
    const offOutbox = onOutboxChange(setPending);
    return () => { offSync(); offOutbox(); };
  }, []);

  if (isHost) return null;

  const title = !connected
    ? 'Sin conexión con la PC principal. Los cambios se guardan en este dispositivo y se envían al reconectar.'
    : pending > 0 ? `${pending} cambio(s) enviándose a la PC principal` : 'Sincronizado con la PC principal';

  return (
    <div title={title} className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black border transition-all duration-300 tracking-wider",
      connected
        ? (pending > 0 ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-emerald-50 text-emerald-700 border-emerald-100")
        : "bg-rose-50 text-rose-700 border-rose-100 animate-pulse",
      className
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full",
        connected ? (pending > 0 ? "bg-amber-500" : "bg-emerald-500 animate-pulse") : "bg-rose-500")} />
      {connected ? 'CONECTADO' : 'SIN CONEXIÓN'}
      {pending > 0 && <span>· {pending} PENDIENTE{pending === 1 ? '' : 'S'}</span>}
    </div>
  );
}
