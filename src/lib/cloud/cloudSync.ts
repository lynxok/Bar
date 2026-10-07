// Réplica de la base local hacia el Supabase del cliente.
// La PC principal sigue siendo la base maestra: la nube es una copia que se actualiza sola
// (carga inicial completa + cambios incrementales por updatedAt y registro de borrados).
// Sin dependencia de supabase-js: usa la API REST (GoTrue + PostgREST) con fetch.
import { db, isHost, SYNCED_TABLES } from '../../db/database';
import { CLOUD_SCHEMA_VERSION } from './schema';

/** Tablas que se suben. `users` queda afuera: tiene PIN y hashes de contraseña. */
export const CLOUD_TABLES = SYNCED_TABLES.filter(t => t !== 'users');

const STORAGE_KEY = 'lynx_cloud';
const BATCH = 400;
const PUSH_EVERY_MS = 30_000;
/** Los registros de borrado locales se limpian a los 30 días: pasado ese tiempo sin subir, se rehace la carga completa. */
const FULL_RESYNC_AFTER_MS = 25 * 24 * 60 * 60 * 1000;

export interface CloudSession { access_token: string; refresh_token: string; expires_at: number }
export interface CloudConfig {
  url: string;
  anonKey: string;
  email: string;
  enabled: boolean;
  session?: CloudSession;
  cursors: Record<string, string>;
  /** Claves ya subidas con updatedAt == cursor (para no repetirlas en cada pasada) */
  cursorKeys?: Record<string, string[]>;
  /** Último id de la tabla local de borrados ya subido */
  tombId?: number;
  lastFullSyncAt?: string;
  lastPushAt?: string;
}
export type CloudPhase = 'disconnected' | 'idle' | 'syncing' | 'error' | 'auth_error';
export interface CloudStatus {
  phase: CloudPhase;
  message?: string;
  lastPushAt?: string;
  lastFullSyncAt?: string;
  progress?: { table: string; done: number; total: number };
}

// ---------------- Persistencia de la configuración ----------------
export const loadCloudConfig = (): CloudConfig | null => {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
};
const saveCloudConfig = (c: CloudConfig | null) => {
  try { c ? localStorage.setItem(STORAGE_KEY, JSON.stringify(c)) : localStorage.removeItem(STORAGE_KEY); } catch { /* sin storage */ }
};

// ---------------- Estado observable para la UI ----------------
let status: CloudStatus = { phase: 'disconnected' };
const listeners = new Set<(s: CloudStatus) => void>();
const setStatus = (patch: Partial<CloudStatus>) => {
  status = { ...status, ...patch };
  listeners.forEach(l => l(status));
};
export const getCloudStatus = () => status;
export const subscribeCloudStatus = (fn: (s: CloudStatus) => void) => { listeners.add(fn); fn(status); return () => { listeners.delete(fn); }; };

// ---------------- HTTP ----------------
type Fetch = typeof fetch;
let fetchImpl: Fetch = (input, init) => fetch(input, init);
/** Solo para tests */
export const __setFetch = (f: Fetch) => { fetchImpl = f; };

export class CloudError extends Error {
  constructor(message: string, public kind: 'network' | 'auth' | 'schema' | 'forbidden' | 'server') { super(message); }
}

export const normalizeUrl = (u: string) => u.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');

const request = async (cfg: Pick<CloudConfig, 'url' | 'anonKey'>, path: string, init: RequestInit & { token?: string } = {}) => {
  const headers: Record<string, string> = {
    apikey: cfg.anonKey,
    'Content-Type': 'application/json',
    ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    ...((init.headers as Record<string, string>) || {}),
  };
  let res: Response;
  try {
    res = await fetchImpl(`${normalizeUrl(cfg.url)}${path}`, { ...init, headers });
  } catch {
    throw new CloudError('Sin conexión con Supabase. Se reintenta automáticamente.', 'network');
  }
  if (res.ok) {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }
  let body: any = null;
  try { body = await res.json(); } catch { /* sin cuerpo */ }
  const msg = body?.msg || body?.message || body?.error_description || body?.error || `HTTP ${res.status}`;
  if (res.status === 401 || body?.code === 'PGRST301') throw new CloudError(msg, 'auth');
  if (res.status === 400 && /invalid login|invalid_grant|credentials/i.test(msg)) throw new CloudError('Mail o contraseña incorrectos.', 'auth');
  if (res.status === 404 || body?.code === '42P01' || body?.code === 'PGRST205') {
    throw new CloudError('Falta crear las tablas: ejecutá el script SQL en el proyecto de Supabase.', 'schema');
  }
  if (res.status === 403 || body?.code === '42501') throw new CloudError('Este usuario no tiene permiso: revisá que su mail esté en el script SQL.', 'forbidden');
  throw new CloudError(msg, 'server');
};

const toSession = (r: any): CloudSession => ({
  access_token: r.access_token,
  refresh_token: r.refresh_token,
  expires_at: Date.now() + (Number(r.expires_in) || 3600) * 1000,
});

export const signIn = async (url: string, anonKey: string, email: string, password: string) =>
  toSession(await request({ url, anonKey }, '/auth/v1/token?grant_type=password', {
    method: 'POST', body: JSON.stringify({ email: email.trim(), password }),
  }));

/** Devuelve un token válido, renovándolo si está por vencer. */
const ensureToken = async (cfg: CloudConfig): Promise<string> => {
  if (!cfg.session) throw new CloudError('Hay que volver a iniciar sesión en la nube.', 'auth');
  if (cfg.session.expires_at - Date.now() > 60_000) return cfg.session.access_token;
  try {
    cfg.session = toSession(await request(cfg, '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', body: JSON.stringify({ refresh_token: cfg.session.refresh_token }),
    }));
  } catch (e: any) {
    if (e instanceof CloudError && e.kind === 'network') throw e;
    throw new CloudError('La sesión de la nube venció. Volvé a conectar con la contraseña.', 'auth');
  }
  saveCloudConfig(cfg);
  return cfg.session.access_token;
};

/** Verifica que el script se ejecutó y que el usuario está habilitado. */
export const verifySchema = async (cfg: CloudConfig) => {
  const token = await ensureToken(cfg);
  const rows = await request(cfg, '/rest/v1/lynx_meta?key=eq.schema_version&select=value', { token });
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new CloudError(`El usuario ${cfg.email} no está habilitado. Generá el script con ese mail y ejecutalo de nuevo.`, 'forbidden');
  }
  const version = Number(rows[0].value);
  if (version < CLOUD_SCHEMA_VERSION) throw new CloudError('El esquema de la nube es viejo: volvé a ejecutar el script SQL.', 'schema');
};

// ---------------- Conversión de registros ----------------
const tableOf = (name: string) => db.table(name);
const keyOf = (name: string, row: any) => {
  const kp = tableOf(name).schema.primKey.keyPath as string;
  return String(row[kp]);
};

const upsert = async (cfg: CloudConfig, input: any[]) => {
  // Postgres no admite dos filas con la misma clave en un mismo upsert: queda la última
  const rows = [...new Map(input.map(r => [`${r.table_name}\u0000${r.record_id}`, r])).values()];
  for (let i = 0; i < rows.length; i += BATCH) {
    const token = await ensureToken(cfg);
    await request(cfg, '/rest/v1/lynx_records?on_conflict=table_name,record_id', {
      method: 'POST', token, body: JSON.stringify(rows.slice(i, i + BATCH)),
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    });
  }
};

const record = (table: string, row: any, run?: string) => ({
  table_name: table,
  record_id: keyOf(table, row),
  data: row,
  deleted: false,
  updated_at: row.updatedAt && row.updatedAt > '1971' ? row.updatedAt : new Date().toISOString(),
  sync_run: run ?? null,
});

const writeMeta = async (cfg: CloudConfig, key: string, value: unknown) => {
  const token = await ensureToken(cfg);
  await request(cfg, '/rest/v1/lynx_meta?on_conflict=key', {
    method: 'POST', token, body: JSON.stringify([{ key, value, updated_at: new Date().toISOString() }]),
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
  });
};

let pushing = false;

// ---------------- Carga completa ----------------
/**
 * Sube TODA la base local. Lo que estaba en la nube y ya no existe localmente queda marcado como borrado.
 * Se puede repetir sin duplicar nada.
 */
export const fullUpload = async (onProgress?: (p: { table: string; done: number; total: number }) => void) => {
  const cfg = loadCloudConfig();
  if (!cfg) throw new CloudError('La nube no está configurada.', 'auth');
  const run = `R-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const startedAt = new Date().toISOString();
  if (pushing) throw new CloudError('Ya hay una sincronización en curso.', 'server');
  pushing = true;
  setStatus({ phase: 'syncing', message: 'Subiendo la base completa…' });
  try {
    const lastTomb = await db.tombstones.orderBy(':id').last();
    await verifySchema(cfg);
    for (const table of CLOUD_TABLES) {
      const rows = await tableOf(table).toArray();
      const p = { table, done: 0, total: rows.length };
      onProgress?.(p); setStatus({ progress: p });
      for (let i = 0; i < rows.length; i += BATCH) {
        await upsert(cfg, rows.slice(i, i + BATCH).map(r => record(table, r, run)));
        p.done = Math.min(rows.length, i + BATCH);
        onProgress?.({ ...p }); setStatus({ progress: { ...p } });
      }
      // Lo que quedó en la nube de cargas anteriores y ya no está en esta PC
      const token = await ensureToken(cfg);
      await request(cfg, `/rest/v1/lynx_records?table_name=eq.${encodeURIComponent(table)}&deleted=eq.false&or=(sync_run.is.null,sync_run.neq.${run})`, {
        method: 'PATCH', token, headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ deleted: true, data: null, updated_at: new Date().toISOString() }),
      });
      cfg.cursors[table] = startedAt;
    }
    cfg.cursorKeys = {};
    cfg.tombId = lastTomb?.id ?? 0;
    cfg.lastFullSyncAt = cfg.lastPushAt = new Date().toISOString();
    saveCloudConfig(cfg);
    await writeMeta(cfg, 'last_full_sync', { at: cfg.lastFullSyncAt, tables: CLOUD_TABLES.length });
    setStatus({ phase: 'idle', message: undefined, progress: undefined, lastPushAt: cfg.lastPushAt, lastFullSyncAt: cfg.lastFullSyncAt });
  } catch (e: any) {
    reportError(e);
    throw e;
  } finally {
    pushing = false;
  }
};

// ---------------- Cambios incrementales ----------------
/** Sube lo que cambió desde la última vez. Devuelve cuántos registros subió. */
export const pushChanges = async (): Promise<number> => {
  const cfg = loadCloudConfig();
  if (!cfg?.enabled || !cfg.session || pushing) return 0;
  if (!cfg.lastFullSyncAt || !cfg.lastPushAt || Date.now() - Date.parse(cfg.lastPushAt) > FULL_RESYNC_AFTER_MS) {
    await fullUpload();
    return -1;
  }
  pushing = true;
  let count = 0;
  try {
    cfg.cursorKeys = cfg.cursorKeys || {};
    for (const table of CLOUD_TABLES) {
      const since = cfg.cursors[table] || new Date(0).toISOString();
      const already = new Set(cfg.cursorKeys[table] || []);
      const rows = (await tableOf(table).where('updatedAt').aboveOrEqual(since).toArray())
        .filter(r => !(r.updatedAt === since && already.has(keyOf(table, r))));
      if (!rows.length) continue;
      if (status.phase !== 'syncing') setStatus({ phase: 'syncing', message: 'Sincronizando…' });
      await upsert(cfg, rows.map(r => record(table, r)));
      const max = rows.reduce((m, r) => (r.updatedAt > m ? r.updatedAt : m), since);
      const atMax = rows.filter(r => r.updatedAt === max).map(r => keyOf(table, r));
      cfg.cursorKeys[table] = max === since ? [...already, ...atMax] : atMax;
      cfg.cursors[table] = max;
      count += rows.length;
      saveCloudConfig(cfg);
    }
    const newTombs = await db.tombstones.where(':id').above(cfg.tombId ?? 0).toArray();
    const tombs = newTombs.filter(t => (CLOUD_TABLES as readonly string[]).includes(t.table));
    if (tombs.length) {
      const del = [...new Map(tombs.map(t => [`${t.table}\u0000${t.key}`, {
        table_name: t.table, record_id: String(t.key), data: null, deleted: true, updated_at: t.deletedAt, sync_run: null,
      }])).values()];
      await upsert(cfg, del);
      count += del.length;
    }
    if (newTombs.length) cfg.tombId = Math.max(cfg.tombId ?? 0, ...newTombs.map(t => t.id ?? 0));
    cfg.lastPushAt = new Date().toISOString();
    saveCloudConfig(cfg);
    setStatus({ phase: 'idle', message: undefined, lastPushAt: cfg.lastPushAt, lastFullSyncAt: cfg.lastFullSyncAt });
    return count;
  } catch (e) {
    reportError(e);
    return 0;
  } finally {
    pushing = false;
  }
};

const reportError = (e: any) => {
  const kind = e instanceof CloudError ? e.kind : 'server';
  setStatus({
    phase: kind === 'auth' || kind === 'forbidden' ? 'auth_error' : 'error',
    message: e?.message || 'Error desconocido al sincronizar.',
    progress: undefined,
  });
};

// ---------------- Conexión / desconexión ----------------
/** Inicia sesión, verifica el esquema y guarda la configuración. No sube datos (eso es fullUpload). */
export const connectCloud = async (params: { url: string; anonKey: string; email: string; password: string }) => {
  const url = normalizeUrl(params.url);
  if (!/^https:\/\/.+/.test(url)) throw new CloudError('La URL del proyecto debe empezar con https://', 'server');
  const session = await signIn(url, params.anonKey.trim(), params.email, params.password);
  const prev = loadCloudConfig();
  const sameProject = prev && prev.url === url;
  const cfg: CloudConfig = {
    url, anonKey: params.anonKey.trim(), email: params.email.trim().toLowerCase(), enabled: true, session,
    cursors: sameProject ? prev!.cursors : {},
    cursorKeys: sameProject ? prev!.cursorKeys : undefined,
    tombId: sameProject ? prev!.tombId : undefined,
    lastFullSyncAt: sameProject ? prev!.lastFullSyncAt : undefined,
    lastPushAt: sameProject ? prev!.lastPushAt : undefined,
  };
  await verifySchema(cfg);
  saveCloudConfig(cfg);
  setStatus({ phase: 'idle', message: undefined, lastPushAt: cfg.lastPushAt, lastFullSyncAt: cfg.lastFullSyncAt });
  startCloudSync();
  return cfg;
};

export const setCloudEnabled = (enabled: boolean) => {
  const cfg = loadCloudConfig();
  if (!cfg) return;
  cfg.enabled = enabled;
  saveCloudConfig(cfg);
  enabled ? startCloudSync() : stopCloudSync();
};

export const disconnectCloud = () => {
  stopCloudSync();
  saveCloudConfig(null);
  setStatus({ phase: 'disconnected', message: undefined, progress: undefined, lastPushAt: undefined, lastFullSyncAt: undefined });
};

// ---------------- Programador ----------------
let timer: ReturnType<typeof setInterval> | null = null;
export const startCloudSync = () => {
  if (!isHost) return;
  const cfg = loadCloudConfig();
  if (!cfg) { setStatus({ phase: 'disconnected' }); return; }
  setStatus({ phase: status.phase === 'disconnected' ? 'idle' : status.phase, lastPushAt: cfg.lastPushAt, lastFullSyncAt: cfg.lastFullSyncAt });
  if (!cfg.enabled || timer) return;
  timer = setInterval(() => { pushChanges().catch(() => {}); }, PUSH_EVERY_MS);
  // Primera pasada apenas abre la app (si ya se hizo la carga inicial)
  if (cfg.lastFullSyncAt) setTimeout(() => { pushChanges().catch(() => {}); }, 5_000);
};
export const stopCloudSync = () => { if (timer) clearInterval(timer); timer = null; };
