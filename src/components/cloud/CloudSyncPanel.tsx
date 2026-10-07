// Asistente para conectar la PC principal con el Supabase del cliente y ver el estado de la réplica.
import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Cloud, CloudOff, Copy, Loader2, LogOut, RefreshCw, UploadCloud } from 'lucide-react';
import { isHost } from '../../db/database';
import {
  connectCloud, disconnectCloud, fullUpload, getCloudStatus, loadCloudConfig, pushChanges, setCloudEnabled,
  subscribeCloudStatus, CLOUD_TABLES, type CloudStatus,
} from '../../lib/cloud/cloudSync';
import { buildSchemaSql } from '../../lib/cloud/schema';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/utils';

const inputCls = 'w-full h-11 px-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20';
const labelCls = 'block text-xs font-black uppercase tracking-wide text-on-surface-variant mb-1';
const btnPrimary = 'h-11 px-4 rounded-xl bg-primary text-on-primary text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50';
const btnGhost = 'h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50';

const fmt = (iso?: string) => iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0', done ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface')}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : n}
      </div>
      <div className="flex-1 min-w-0 space-y-3 pb-6">
        <h3 className="font-black text-on-surface">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function CloudSyncPanel() {
  const { showToast, confirm } = useToast();
  const [status, setStatus] = useState<CloudStatus>(getCloudStatus());
  const [cfg, setCfg] = useState(loadCloudConfig());
  const [form, setForm] = useState({ email: cfg?.email || '', url: cfg?.url || '', anonKey: cfg?.anonKey || '', password: '' });
  const [busy, setBusy] = useState<null | 'connect' | 'upload' | 'push'>(null);
  const [sqlCopied, setSqlCopied] = useState(false);

  useEffect(() => subscribeCloudStatus(s => { setStatus(s); setCfg(loadCloudConfig()); }), []);

  if (!isHost) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 flex gap-3 items-start">
        <CloudOff className="w-5 h-5 text-on-surface-variant shrink-0 mt-0.5" />
        <p className="text-sm text-on-surface-variant">La conexión con la nube se configura desde la <b>PC principal</b> (la app de escritorio), que es la que guarda la base del bar.</p>
      </div>
    );
  }

  const connected = !!cfg?.session;
  const uploaded = !!cfg?.lastFullSyncAt;
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim());

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(buildSchemaSql(form.email));
      setSqlCopied(true);
      showToast('Script copiado. Pegalo en el SQL Editor de Supabase y tocá Run.', 'success');
    } catch {
      showToast('No se pudo copiar al portapapeles.', 'error');
    }
  };

  const connect = async () => {
    setBusy('connect');
    try {
      await connectCloud({ url: form.url, anonKey: form.anonKey, email: form.email, password: form.password });
      setForm(f => ({ ...f, password: '' }));
      setCfg(loadCloudConfig());
      showToast('Conectado a la nube del bar.', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setBusy(null); }
  };

  const upload = async () => {
    setBusy('upload');
    try {
      await fullUpload();
      showToast('Base completa subida a la nube.', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setBusy(null); setCfg(loadCloudConfig()); }
  };

  const syncNow = async () => {
    setBusy('push');
    const n = await pushChanges();
    setBusy(null);
    const s = getCloudStatus();
    if (s.phase === 'error' || s.phase === 'auth_error') showToast(s.message || 'Error al sincronizar.', 'error');
    else showToast(n > 0 ? `${n} cambio(s) subidos.` : 'La nube ya estaba al día.', 'success');
  };

  const disconnect = async () => {
    const ok = await confirm({ title: 'Desconectar la nube', message: 'Esta PC deja de enviar datos. Lo que ya se subió queda en el Supabase del cliente.', confirmText: 'Desconectar', isDestructive: true });
    if (!ok) return;
    disconnectCloud();
    setCfg(null);
    setForm(f => ({ ...f, password: '' }));
  };

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
      <div className="p-6 border-b border-outline-variant flex items-center gap-3 flex-wrap">
        <Cloud className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-lg text-on-surface flex-1">Copia en la nube (Supabase del cliente)</h2>
        <StatusPill status={status} connected={connected} uploaded={uploaded} />
      </div>

      <div className="p-6">
        <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
          Esta PC sigue siendo la base del bar y funciona igual sin internet. La nube guarda una <b>copia que se actualiza sola</b> cada 30 segundos,
          para consultar ventas, caja y vasos desde afuera. Los usuarios y sus claves no se suben.
        </p>

        <Step n={1} title="Crear el proyecto en Supabase (una sola vez)" done={connected}>
          <ol className="text-sm text-on-surface-variant list-decimal pl-5 space-y-1">
            <li>Entrar a <b>supabase.com</b> con la cuenta del cliente y crear un proyecto nuevo (región São Paulo).</li>
            <li>En <b>Authentication → Sign In / Providers</b>, desactivar <b>"Allow new users to sign up"</b>.</li>
            <li>En <b>Authentication → Users → Add user</b>, crear el usuario del bar (mail y contraseña) con <b>"Auto confirm"</b>.</li>
          </ol>
        </Step>

        <Step n={2} title="Crear las tablas" done={connected}>
          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <div><label className={labelCls}>Mail del usuario del bar</label>
              <input className={inputCls} value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setSqlCopied(false); }} placeholder="caja@mibar.com" /></div>
            <button onClick={copySql} disabled={!emailOk} className={btnGhost}><Copy className="w-4 h-4" /> {sqlCopied ? 'Copiado' : 'Copiar script SQL'}</button>
          </div>
          <p className="text-xs text-on-surface-variant">En Supabase: <b>SQL Editor → New query</b>, pegar y tocar <b>Run</b>. Solo ese mail va a poder ver los datos.</p>
        </Step>

        <Step n={3} title="Conectar esta PC" done={connected}>
          <p className="text-xs text-on-surface-variant">En Supabase → <b>Project Settings</b>: la URL está en <b>Data API</b> y la clave en <b>API Keys</b> (la <b>publishable</b> <code>sb_publishable_…</code> o la <b>anon public</b>). Nunca uses la clave <i>secret</i> ni <i>service_role</i>.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Project URL</label><input className={inputCls} value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://xxxx.supabase.co" /></div>
            <div><label className={labelCls}>Clave publishable / anon</label><input type="password" className={inputCls} value={form.anonKey} onChange={e => setForm({ ...form, anonKey: e.target.value })} placeholder="sb_publishable_… o eyJhbGciOi…" /></div>
            <div><label className={labelCls}>Contraseña del usuario del bar</label><input type="password" className={inputCls} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} onKeyDown={e => e.key === 'Enter' && connect()} /></div>
            <div className="flex items-end">
              <button onClick={connect} disabled={!!busy || !emailOk || !form.url || !form.anonKey || !form.password} className={cn(btnPrimary, 'w-full')}>
                {busy === 'connect' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />} {connected ? 'Reconectar' : 'Conectar y verificar'}
              </button>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant">La contraseña no se guarda: se usa una sola vez para obtener la sesión.</p>
        </Step>

        <Step n={4} title="Subir la base completa" done={uploaded}>
          <p className="text-xs text-on-surface-variant">Sube las {CLOUD_TABLES.length} tablas de esta PC. Se puede repetir cuando quieras sin duplicar nada; lo que ya no exista acá queda marcado como borrado en la nube.</p>
          {status.progress && busy === 'upload' && (
            <div className="text-xs text-on-surface-variant">Subiendo <b>{status.progress.table}</b>: {status.progress.done}/{status.progress.total}</div>
          )}
          <div className="flex gap-2 flex-wrap">
            <button onClick={upload} disabled={!connected || !!busy} className={btnPrimary}>
              {busy === 'upload' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />} {uploaded ? 'Volver a subir todo' : 'Subir base completa'}
            </button>
          </div>
        </Step>

        {connected && (
          <div className="rounded-xl bg-surface-container-low p-4 space-y-3">
            <div className="grid sm:grid-cols-3 gap-3 text-sm text-on-surface">
              <div><div className={labelCls}>Proyecto</div><div className="truncate">{cfg?.url.replace('https://', '')}</div></div>
              <div><div className={labelCls}>Última sincronización</div><div>{fmt(status.lastPushAt || cfg?.lastPushAt)}</div></div>
              <div><div className={labelCls}>Última carga completa</div><div>{fmt(cfg?.lastFullSyncAt)}</div></div>
            </div>
            {status.message && (status.phase === 'error' || status.phase === 'auth_error') && (
              <div className="text-sm font-bold text-rose-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {status.message}</div>
            )}
            <div className="flex gap-2 flex-wrap items-center">
              <label className="flex items-center gap-2 text-sm text-on-surface mr-auto">
                <input type="checkbox" checked={!!cfg?.enabled} onChange={e => { setCloudEnabled(e.target.checked); setCfg(loadCloudConfig()); }} />
                Sincronización automática
              </label>
              <button onClick={syncNow} disabled={!uploaded || !!busy} className={btnGhost}>
                {busy === 'push' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Sincronizar ahora
              </button>
              <button onClick={disconnect} disabled={!!busy} className={cn(btnGhost, 'text-rose-600')}><LogOut className="w-4 h-4" /> Desconectar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status, connected, uploaded }: { status: CloudStatus; connected: boolean; uploaded: boolean }) {
  const [label, cls] =
    !connected ? ['Sin configurar', 'bg-surface-container text-on-surface-variant'] :
    status.phase === 'syncing' ? ['Sincronizando…', 'bg-sky-100 text-sky-800'] :
    status.phase === 'auth_error' ? ['Revisar acceso', 'bg-rose-100 text-rose-700'] :
    status.phase === 'error' ? ['Reintentando', 'bg-amber-100 text-amber-800'] :
    !uploaded ? ['Falta la carga inicial', 'bg-amber-100 text-amber-800'] :
    ['Al día', 'bg-emerald-100 text-emerald-800'];
  return <span className={cn('px-3 py-1 rounded-full text-xs font-black', cls)}>{label}</span>;
}
