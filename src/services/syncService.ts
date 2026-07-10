import { db, isHost } from '../db/database';

let syncIntervalId: any = null;
let isSyncing = false;
let onSyncStateChangeCallback: ((connected: boolean) => void) | null = null;
let isConnected = true;

// Lista de tablas críticas que necesitan sincronización en tiempo real
const SYNC_TABLES = [
  'products', 'orders', 'expenses', 'salonTables', 'paymentOrders',
  'comandas', 'rewards', 'customers', 'shifts', 'users', 'messages', 
  'floorPlans', 'loyaltyConfig', 'loyaltyTransactions', 'clientOrders'
];

export function onSyncStateChange(callback: (connected: boolean) => void) {
  onSyncStateChangeCallback = callback;
}

async function syncTable(tableName: string) {
  try {
    const hostUrl = window.location.origin;
    const res = await fetch(`${hostUrl}/api/db/${tableName}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    
    const serverData = await res.json();
    if (!Array.isArray(serverData)) return;

    const localTable = (db as any)[tableName];
    if (!localTable) return;

    const idKey = localTable.schema.primKey.name || 'id';
    const localData = await localTable.toArray();
    const localMap = new Map(localData.map((item: any) => [item[idKey], item]));
    const serverIds = new Set(serverData.map((item: any) => item[idKey]));

    const originalAdd = localTable.originalAdd || localTable.add.bind(localTable);
    const originalUpdate = localTable.originalUpdate || localTable.update.bind(localTable);
    const originalDelete = localTable.originalDelete || localTable.delete.bind(localTable);

    // 1. Agregar o actualizar elementos locales
    for (const serverItem of serverData) {
      const serverId = serverItem[idKey];
      const localItem = localMap.get(serverId);

      if (!localItem) {
        // No existe localmente: agregar
        await originalAdd(serverItem);
      } else {
        // Sí existe: comparar contenido y actualizar si hay diferencias
        if (JSON.stringify(localItem) !== JSON.stringify(serverItem)) {
          await originalUpdate(serverId, serverItem);
        }
      }
    }

    // 2. Eliminar elementos locales que ya no existen en el servidor
    for (const localItem of localData) {
      const localId = localItem[idKey];
      if (!serverIds.has(localId)) {
        await originalDelete(localId);
      }
    }
  } catch (err) {
    console.error(`Error sincronizando la tabla ${tableName}:`, err);
    throw err;
  }
}

export async function runFullSync() {
  if (isSyncing) return;
  isSyncing = true;
  
  let successCount = 0;
  
  for (const table of SYNC_TABLES) {
    try {
      await syncTable(table);
      successCount++;
    } catch (err) {
      // Registrar error pero continuar con otras tablas
    }
  }

  const prevConnected = isConnected;
  isConnected = successCount === SYNC_TABLES.length;
  
  if (prevConnected !== isConnected && onSyncStateChangeCallback) {
    onSyncStateChangeCallback(isConnected);
  }

  isSyncing = false;
}

export function startSyncService() {
  // El host principal no necesita sincronizar con nadie (es la base de datos maestra)
  if (isHost) {
    console.log("Modo PC Base (Host): Servicio de sincronización desactivado.");
    return;
  }

  if (syncIntervalId) return;

  console.log("Iniciando servicio de sincronización en cliente remoto...");
  
  // Sincronizar inmediatamente al arrancar
  runFullSync().catch(console.error);

  // Sincronización recurrente cada 3 segundos
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
