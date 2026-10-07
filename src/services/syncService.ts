import { db, isHost, SYNCED_TABLES, flushOutbox, getPendingKeys } from '../db/database';
import { apiFetch, getAllowedTables, getPublicTableId, getToken, isPublicClientRoute } from '../lib/auth';

/*
 * Sincronización de celulares/tablets con la PC principal:
 * - Incremental: solo se piden los cambios desde la última sync de cada tabla.
 * - En tiempo real: el host avisa por SSE (/api/events) qué tabla cambió.
 * - Polling de respaldo cada 15 s y sync completa cada 10 min (o al arrancar).
 * - Antes de descargar se envían los cambios locales pendientes (outbox) y la sync
 *   nunca pisa registros con cambios locales todavía no confirmados.
 */

const POLL_MS = 15_000;
const FULL_SYNC_MS = 10 * 60_000;
const PUBLIC_POLL_MS = 5_000;

let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let eventSource: EventSource | null = null;
let isSyncing = false;
let syncAgain = false;
let lastFullSync = 0;
const dirtyTables = new Set<string>();
const cursors = new Map<string, string>();
const syncListeners = new Set<(connected: boolean) => void>();
let isConnected = true;

export function onSyncStateChange(callback: (connected: boolean) => void) {
  syncListeners.add(callback);
  return () => { syncListeners.delete(callback); };
}

export const getSyncConnected = () => isConnected;

const setConnected = (ok: boolean) => {
  const prev = isConnected;
  isConnected = ok;
  if (prev !== ok) syncListeners.forEach(fn => fn(ok));
};

/**
 * Aplica datos del host en la tabla local sin pasar por los interceptores.
 * @param deleteMissingScope si se indica, borra los registros locales de ese alcance que el host ya no tiene
 */
async function applyServerData(tableName: string, records: any[], deletedKeys: any[], deleteMissingScope?: (item: any) => boolean) {
  const localTable = (db as any)[tableName];
  if (!localTable || !Array.isArray(records)) return;
  const idKey = localTable.schema.primKey.name || 'id';
  const pending = await getPendingKeys(tableName);
  const originalDelete = localTable.originalDelete || localTable.delete.bind(localTable);

  // Primero los borrados (si una clave se borró y se volvió a crear, gana el registro nuevo)
  const recordKeys = new Set(records.map(r => r[idKey]));
  for (const key of deletedKeys || []) {
    if (!pending.has(key) && !recordKeys.has(key)) await originalDelete(key);
  }

  const toPut: any[] = [];
  for (const r of records) {
    if (pending.has(r[idKey])) continue; // hay un cambio local sin confirmar: no se pisa
    const local = await localTable.get(r[idKey]);
    if (!local || JSON.stringify(local) !== JSON.stringify(r)) toPut.push(r);
  }
  if (toPut.length) await localTable.bulkPut(toPut);

  if (deleteMissingScope) {
    const serverIds = new Set(records.map(r => r[idKey]));
    const localData: any[] = await localTable.toArray();
    for (const item of localData) {
      const key = item[idKey];
      if (deleteMissingScope(item) && !serverIds.has(key) && !pending.has(key)) await originalDelete(key);
    }
  }
}

async function syncTable(tableName: string, full: boolean) {
  const since = full ? '' : (cursors.get(tableName) || '');
  const data = await apiFetch<{ now: string; full: boolean; records: any[]; deleted: any[] }>(
    `/api/sync/${tableName}${since ? `?since=${encodeURIComponent(since)}` : ''}`
  );
  await applyServerData(tableName, data.records, data.deleted, data.full ? () => true : undefined);
  cursors.set(tableName, data.now);
}

/** Modo comensal (carta QR sin login): solo menú, su mesa y sus pedidos */
async function syncPublic() {
  const tableId = getPublicTableId();
  if (!tableId) return;
  const [menu, tableInfo] = await Promise.all([
    apiFetch<any[]>('/api/public/menu'),
    apiFetch<{ table: any; clientOrders: any[] }>(`/api/public/table/${encodeURIComponent(tableId)}`),
  ]);
  await applyServerData('products', menu, [], () => true);
  await applyServerData('salonTables', [tableInfo.table], [], () => true);
  await applyServerData('clientOrders', tableInfo.clientOrders, [], (co) => co.tableId === tableId);
}

/** Sincroniza. Sin argumentos: todas las tablas permitidas (completa si corresponde). */
export async function runFullSync(onlyTables?: string[]) {
  if (isSyncing) { syncAgain = true; onlyTables?.forEach(t => dirtyTables.add(t)); return; }
  isSyncing = true;
  try {
    if (isPublicClientRoute()) {
      await syncPublic();
      setConnected(true);
      return;
    }
    await flushOutbox();
    const full = Date.now() - lastFullSync > FULL_SYNC_MS;
    const allowed = new Set(getAllowedTables());
    const tables = (onlyTables && !full ? onlyTables : [...SYNCED_TABLES]).filter(t => allowed.has(t));
    let failures = 0;
    for (const table of tables) {
      try {
        await syncTable(table, full || !cursors.has(table));
      } catch (err) {
        failures++;
        console.error(`Error sincronizando la tabla ${table}:`, err);
      }
    }
    if (full && failures === 0) lastFullSync = Date.now();
    setConnected(failures === 0);
  } catch (err) {
    console.error('Error de sincronización:', err);
    setConnected(false);
  } finally {
    isSyncing = false;
    if (syncAgain) {
      syncAgain = false;
      const next = [...dirtyTables];
      dirtyTables.clear();
      setTimeout(() => runFullSync(next.length ? next : undefined).catch(console.error), 50);
    }
  }
}

function connectEvents() {
  if (typeof EventSource === 'undefined' || isPublicClientRoute()) return;
  const token = getToken();
  if (!token) return;
  eventSource = new EventSource(`${window.location.origin}/api/events?token=${encodeURIComponent(token)}`);
  let timer: ReturnType<typeof setTimeout> | null = null;
  eventSource.addEventListener('change', (ev: MessageEvent) => {
    try {
      const { table } = JSON.parse(ev.data);
      if (typeof table === 'string') dirtyTables.add(table);
    } catch { /* ignorar */ }
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      const tables = [...dirtyTables];
      dirtyTables.clear();
      runFullSync(tables).catch(console.error);
    }, 150);
  });
  eventSource.onopen = () => setConnected(true);
}

/** Borra del dispositivo los datos que el rol actual no puede ver (p. ej. usuarios de sesiones viejas) */
async function purgeForbiddenTables() {
  const keep = isPublicClientRoute()
    ? new Set(['products', 'salonTables', 'clientOrders'])
    : new Set(getAllowedTables());
  await Promise.all(SYNCED_TABLES.filter(t => !keep.has(t)).map(t => (db as any)[t]?.clear()));
}

export function startSyncService() {
  // El host principal no necesita sincronizar con nadie (es la base de datos maestra)
  if (isHost) {
    console.log("Modo PC Base (Host): Servicio de sincronización desactivado.");
    return;
  }
  if (syncIntervalId) return;

  console.log("Iniciando servicio de sincronización en cliente remoto...");
  lastFullSync = 0;
  cursors.clear();
  purgeForbiddenTables()
    .catch(console.error)
    .finally(() => runFullSync().catch(console.error));

  connectEvents();
  syncIntervalId = setInterval(() => {
    runFullSync().catch(console.error);
  }, isPublicClientRoute() ? PUBLIC_POLL_MS : POLL_MS);
}

export function stopSyncService() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  console.log("Servicio de sincronización detenido.");
}
