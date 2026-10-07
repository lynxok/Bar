import { db, isHost } from '../db/database';
import { apiFetch, getAllowedTables, getPublicTableId, isPublicClientRoute } from '../lib/auth';

let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;
let onSyncStateChangeCallback: ((connected: boolean) => void) | null = null;
let isConnected = true;

// Tablas que se sincronizan con el host (se filtran por las que el rol puede leer)
const SYNC_TABLES = [
  'products', 'orders', 'expenses', 'salonTables', 'paymentOrders',
  'comandas', 'rewards', 'customers', 'shifts', 'users', 'messages',
  'floorPlans', 'loyaltyConfig', 'loyaltyTransactions', 'clientOrders', 'billingDrafts'
];

export function onSyncStateChange(callback: (connected: boolean) => void) {
  onSyncStateChangeCallback = callback;
}

/**
 * Reemplaza el contenido local de una tabla (o de un subconjunto) por lo que dice el host.
 * Usa put/delete sin interceptores para no reenviar los cambios al servidor.
 * @param scope si se indica, solo se borran registros locales que cumplan el filtro
 */
async function applyServerData(tableName: string, serverData: any[], scope?: (item: any) => boolean) {
  const localTable = (db as any)[tableName];
  if (!localTable || !Array.isArray(serverData)) return;

  const idKey = localTable.schema.primKey.name || 'id';
  const localData: any[] = await localTable.toArray();
  const localMap = new Map(localData.map((item: any) => [item[idKey], item]));
  const serverIds = new Set(serverData.map((item: any) => item[idKey]));
  const originalDelete = localTable.originalDelete || localTable.delete.bind(localTable);

  const toPut = serverData.filter(serverItem => {
    const localItem = localMap.get(serverItem[idKey]);
    return !localItem || JSON.stringify(localItem) !== JSON.stringify(serverItem);
  });
  if (toPut.length) await localTable.bulkPut(toPut);

  for (const localItem of localData) {
    if (scope && !scope(localItem)) continue;
    if (!serverIds.has(localItem[idKey])) await originalDelete(localItem[idKey]);
  }
}

async function syncTable(tableName: string) {
  const serverData = await apiFetch<any[]>(`/api/db/${tableName}`);
  await applyServerData(tableName, serverData);
}

/** Modo comensal (carta QR sin login): solo menú, su mesa y sus pedidos */
async function syncPublic() {
  const tableId = getPublicTableId();
  if (!tableId) return;
  const [menu, tableInfo] = await Promise.all([
    apiFetch<any[]>('/api/public/menu'),
    apiFetch<{ table: any; clientOrders: any[] }>(`/api/public/table/${encodeURIComponent(tableId)}`),
  ]);
  await applyServerData('products', menu);
  await applyServerData('salonTables', [tableInfo.table], () => true);
  await applyServerData('clientOrders', tableInfo.clientOrders, (co) => co.tableId === tableId);
}

export async function runFullSync() {
  if (isSyncing) return;
  isSyncing = true;

  let ok = false;
  try {
    if (isPublicClientRoute()) {
      await syncPublic();
      ok = true;
    } else {
      const allowed = new Set(getAllowedTables());
      const tables = SYNC_TABLES.filter(t => allowed.has(t));
      let successCount = 0;
      for (const table of tables) {
        try {
          await syncTable(table);
          successCount++;
        } catch (err) {
          console.error(`Error sincronizando la tabla ${table}:`, err);
        }
      }
      ok = tables.length > 0 && successCount === tables.length;
    }
  } catch (err) {
    console.error('Error de sincronización:', err);
  }

  const prevConnected = isConnected;
  isConnected = ok;
  if (prevConnected !== isConnected && onSyncStateChangeCallback) {
    onSyncStateChangeCallback(isConnected);
  }
  isSyncing = false;
}

/** Borra del dispositivo los datos que el rol actual no puede ver (p. ej. usuarios de sesiones viejas) */
async function purgeForbiddenTables() {
  if (isPublicClientRoute()) {
    await Promise.all(SYNC_TABLES.filter(t => !['products', 'salonTables', 'clientOrders'].includes(t))
      .map(t => (db as any)[t]?.clear()));
    return;
  }
  const allowed = new Set(getAllowedTables());
  await Promise.all(SYNC_TABLES.filter(t => !allowed.has(t)).map(t => (db as any)[t]?.clear()));
}

export function startSyncService() {
  // El host principal no necesita sincronizar con nadie (es la base de datos maestra)
  if (isHost) {
    console.log("Modo PC Base (Host): Servicio de sincronización desactivado.");
    return;
  }
  if (syncIntervalId) return;

  console.log("Iniciando servicio de sincronización en cliente remoto...");
  purgeForbiddenTables()
    .catch(console.error)
    .finally(() => runFullSync().catch(console.error));

  syncIntervalId = setInterval(() => {
    runFullSync().catch(console.error);
  }, 3000);
}

export function stopSyncService() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log("Servicio de sincronización detenido.");
  }
}
