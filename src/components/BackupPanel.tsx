import { useEffect, useState } from 'react';
import { DownloadCloud, FolderOpen, History, RefreshCw, Save, Upload } from 'lucide-react';
import {
  createBackup, exportBackup, listBackups, openBackupFolder,
  restoreFromFile, restoreFromStoredBackup, type BackupInfo,
} from '../lib/backup';
import { LoggerService } from '../lib/LoggerService';

const fmtSize = (n: number) => n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
const fmtDate = (iso: string) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
const kindLabel = (name: string) => name.endsWith('-auto.json.gz') ? 'Automática' : name.endsWith('-prerestore.json.gz') ? 'Antes de restaurar' : 'Manual';

/** Copias de seguridad de la base local (visible solo en la PC principal). */
export function BackupPanel() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const refresh = () => listBackups().then(setBackups).catch(() => setBackups([]));
  useEffect(() => { refresh(); }, []);

  const run = async (label: string, fn: () => Promise<string | null | void>) => {
    setBusy(label);
    setMessage(null);
    try {
      const text = await fn();
      if (text) setMessage({ type: 'ok', text });
      await refresh();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Ocurrió un error' });
    } finally {
      setBusy(null);
    }
  };

  const confirmRestore = (what: string) => window.confirm(
    `Vas a reemplazar TODOS los datos actuales (ventas, stock, clientes, usuarios…) por los de ${what}.\n\n` +
    'Antes se guarda automáticamente una copia del estado actual. ¿Continuar?'
  );

  const afterRestore = async (createdAt: string | null) => {
    if (!createdAt) return null;
    await LoggerService.audit('RESTORE', 'BACKUP', `Datos restaurados desde copia del ${fmtDate(createdAt)}`);
    setTimeout(() => window.location.reload(), 1500);
    return `Copia del ${fmtDate(createdAt)} restaurada. Reiniciando…`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 mt-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-black text-slate-900 flex items-center gap-2"><History className="w-5 h-5 text-indigo-600" /> Copias de seguridad</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Se hace una copia automática por día y se guardan las últimas 30 en esta PC.
            Exportá una copia a un pendrive o a OneDrive cada tanto: si la PC se rompe, es lo único que salva los datos.
          </p>
        </div>
        <button onClick={() => openBackupFolder()} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">
          <FolderOpen className="w-4 h-4" /> Abrir carpeta
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <button disabled={!!busy} onClick={() => run('create', async () => { await createBackup('manual'); return 'Copia creada.'; })}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">
          {busy === 'create' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Crear copia ahora
        </button>
        <button disabled={!!busy} onClick={() => run('export', async () => { const r = await exportBackup(); return r.canceled ? null : `Copia exportada a ${r.path}`; })}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 disabled:opacity-50">
          {busy === 'export' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />} Exportar a archivo…
        </button>
        <button disabled={!!busy} onClick={() => confirmRestore('un archivo') && run('import', async () => afterRestore(await restoreFromFile()))}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-rose-200 text-rose-700 rounded-xl font-bold text-sm hover:bg-rose-50 disabled:opacity-50">
          {busy === 'import' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Restaurar desde archivo…
        </button>
      </div>

      {message && (
        <div className={message.type === 'ok' ? 'text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl' : 'text-xs font-bold text-rose-700 bg-rose-50 p-3 rounded-xl'}>
          {message.text}
        </div>
      )}

      <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
        {backups.length === 0 && <div className="p-4 text-xs text-slate-400 font-bold">Todavía no hay copias.</div>}
        {backups.slice(0, 8).map(b => (
          <div key={b.name} className="flex items-center justify-between p-3 text-xs">
            <div>
              <div className="font-bold text-slate-800">{fmtDate(b.mtime)}</div>
              <div className="text-slate-400">{kindLabel(b.name)} · {fmtSize(b.size)}</div>
            </div>
            <button disabled={!!busy} onClick={() => confirmRestore(`la copia del ${fmtDate(b.mtime)}`) && run(b.name, async () => afterRestore(await restoreFromStoredBackup(b.name)))}
              className="px-3 py-1.5 rounded-lg font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50">
              {busy === b.name ? 'Restaurando…' : 'Restaurar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
