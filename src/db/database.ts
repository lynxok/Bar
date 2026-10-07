import Dexie, { type Table } from 'dexie';
import { getIpc } from '../lib/ipc';
import { apiFetch, isPublicClientRoute } from '../lib/auth';

export interface Product {
  id?: number;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
  takeawayPrice: number;
  popular?: boolean;
  status: string;
  cost?: number;
  recipe?: { ingredientId: number; name: string; quantity: number; unit: string }[];
  prepCount?: number;
  prepTimeTotal?: number;
  variants?: any[];
  description?: string;
  image?: string;
  /** Stock mínimo para alertas y lista de compra (si falta, se usa el umbral general) */
  minStock?: number;
  /** Marca de tiempo del último cambio (la asigna la PC principal) */
  updatedAt?: string;
  priceHistory?: { date: string; oldPrice: number; newPrice: number; oldTakeaway?: number; newTakeaway?: number }[];
}

export interface Order {
  id?: number;
  tableId: string;
  items: any[];
  total: number;
  status: 'open' | 'closed';
  timestamp: string;
  paymentMethod?: string;
  customerId?: string;
  /** Suma de ítems antes de descuentos */
  subtotal?: number;
  discountPct?: number;
  discountAmount?: number;
  /** Usuario que cobró */
  closedBy?: string;
  /** Propina (no forma parte de la venta ni de la facturación) */
  tip?: number;
  /** Referencia del pago externo (Mercado Pago, etc.) */
  paymentRef?: string;
  /** Cuenta dividida: id común, número de parte y cantidad de partes */
  splitGroup?: string;
  splitIndex?: number;
  splitCount?: number;
  splitMode?: 'equal' | 'items';
}

export interface Expense {
  id?: number;
  provider: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

export interface Comanda {
  id?: number;
  tableId: string;
  items: any[];
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
  timestamp: string;
}

export interface Reward {
  id?: number;
  name: string;
  /** Alias principal — coste en puntos para canjear el premio */
  pointsCost: number;
  /** @deprecated usar pointsCost */
  points?: number;
}

export interface Customer {
  id?: number;
  dni: string;
  name: string;
  points: number;
  email?: string;
  phone?: string;
}

export interface BusinessConfig {
  id: string;
  name: string;
  address: string;
  phone: string;
  currency: string;
}

export interface PaymentOrder {
  id?: number;
  provider: string;
  amount: number;
  date: string;
  status: 'Pendiente' | 'Pagado';
}

export interface ChairsConfig {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface TableState {
  id: string;
  status: 'available' | 'occupied_no_order' | 'waiting_food' | 'consuming' | 'checkout' | 'dirty' | 'occupied';
  order: any[];
  lastUpdate: string;
  x: number;
  y: number;
  type: 'round' | 'square' | 'rectangle' | 'stool' | 'wall' | 'bar';
  width: number;
  height: number;
  capacity: number;
  rotation?: number;  // degrees, 0-360
  chairsConfig?: ChairsConfig;
  waiterName?: string;
  label?: string;
}

export interface SystemLog {
  id?: number;
  level: 'error' | 'warning' | 'info';
  message: string;
  context?: string;
  timestamp: string;
}

export interface AuditLog {
  id?: number;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  timestamp: string;
}

export interface Shift {
  id?: number;
  cashierName: string;
  startTime: string;
  endTime?: string; // Optional because shift can be active
  expectedCash: number;
  declaredCash: number;
  difference: number;
  cardTotal: number;
  transferTotal: number;
  comments: string;
  initialCash: number; // Fondo inicial de caja
  status: 'active' | 'closed';
  /** Propinas del turno (total y la parte en efectivo, que queda en la caja) */
  tipsTotal?: number;
  tipsCash?: number;
}

export interface User {
  id?: number;
  name: string;
  role: string;
  /** Solo se usa para enviar una contraseña nueva; nunca se guarda en texto plano */
  pin?: string;
  /** Hash scrypt de la contraseña (solo existe en la PC principal) */
  passwordHash?: string;
  permissions: string[];
  status?: string;
}

export interface Message {
  id?: number;
  text: string;
  senderId: number | string;
  senderName: string;
  senderRole: string; // 'Caja' o 'Cocina'
  timestamp: string;
  status: 'sent' | 'read';
}

export interface FloorPlan {
  id?: number;
  name: string;
  tables: TableState[];
  timestamp: string;
  /** 1 = default, 0 = not default (number for Dexie index) */
  isDefault?: number;
}


// ---------- Vasos propios y lockers (modelo "Stammgast") ----------
/** Vaso/jarra de un cliente, identificado por un QR con código opaco (no contiene el DNI). */
export interface Mug {
  id?: number;
  /** Código impreso en el QR, p. ej. "7F3K9Q". Único. */
  code: string;
  customerDni: string;
  customerName: string;
  capacityMl: number;
  model?: string;
  status: 'active' | 'lost' | 'retired';
  lockerId?: number;
  /** Litros acumulados (en ml) y cantidad de recargas: caché para mostrar rápido; el detalle está en mugFills */
  totalMl: number;
  fillCount: number;
  lastFillAt?: string;
  purchasePrice?: number;
  createdAt: string;
  notes?: string;
  updatedAt?: string;
}

/** Locker físico donde el cliente guarda su vaso. */
export interface Locker {
  id?: number;
  /** Etiqueta física, p. ej. "A-12" */
  label: string;
  status: 'free' | 'assigned' | 'maintenance';
  customerDni?: string;
  customerName?: string;
  mugId?: number;
  assignedAt?: string;
  /** Vencimiento del abono (ISO, fecha). Vacío = sin abono */
  expiresAt?: string;
  monthlyFee?: number;
  notes?: string;
  updatedAt?: string;
}

/** Una recarga cobrada de un vaso. Se registra al cerrar la venta. */
export interface MugFill {
  id?: number;
  mugId: number;
  mugCode: string;
  ownerDni: string;
  productId?: number;
  productName: string;
  volumeMl: number;
  amount: number;
  points: number;
  tableId: string;
  paymentMethod: string;
  servedBy?: string;
  timestamp: string;
  updatedAt?: string;
}

export interface MugProgramConfig {
  /** Cómo suman puntos las recargas: por litro o por plata gastada (1 punto cada $100) */
  pointsMode: 'per_liter' | 'per_peso';
  pointsPerLiter: number;
  /** Descuento opcional sobre la recarga para dueños de vaso (0 = mismo precio) */
  holderDiscountPct: number;
  /** Cervezas habilitadas para recarga, con precio por litro */
  fillProducts: { productId: number; name: string; pricePerLiter: number }[];
  /** Hitos por litros acumulados del cliente: al cruzarlos suma puntos extra */
  milestones: { liters: number; bonusPoints: number; label: string }[];
  defaultLockerFee: number;
}

export interface LoyaltyConfig {
  id: string; // "global"
  pointValue: number;
  tierConfig: { name: string; minPoints: number; color: string }[];
  promotions: {
    id: string;
    name: string;
    multiplier: number;
    targets: string[];
    startDate?: string;
    endDate?: string;
    active: boolean;
  }[];
  /** Programa de vasos propios (opcional: si falta se usan valores por defecto) */
  mugProgram?: MugProgramConfig;
}

export interface LoyaltyTransaction {
  id?: number;
  customerDni: string;
  customerName: string;
  type: 'purchase' | 'redemption' | 'adjustment';
  points: number;
  description: string;
  timestamp: string;
}

export interface ClientOrder {
  id?: number;
  tableId: string;
  customerId: string; // generated client-side comensal session
  items: any[];
  total: number;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

export interface BillingDraft {
  id?: string;
  date: string;
  clientName: string;
  concept: string;
  paymentMethod: string;
  amount: number;
  billed: boolean;
  billingData?: {
    isConsumidorFinal: boolean;
    identificador?: string;
    direccion?: string;
    billingDate: string;
    invoiceNumber?: number;
    cae?: string;
    caeVto?: string;
    filePath?: string;
  };
}

export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'cancelled' | 'no_show';

export interface Reservation {
  id?: number;
  customerName: string;
  phone?: string;
  partySize: number;
  /** Fecha y hora de inicio (ISO) */
  date: string;
  /** Duración estimada en minutos */
  durationMin: number;
  tableId?: string;
  notes?: string;
  status: ReservationStatus;
  createdBy?: string;
  updatedAt?: string;
}

/** Registro de un borrado en el host, para que los dispositivos lo repliquen */
export interface Tombstone {
  id?: number;
  table: string;
  key: any;
  deletedAt: string;
}

/** Cambio hecho en un celular/tablet, pendiente de enviar al host */
export interface OutboxEntry {
  id?: number;
  table: string;
  method: 'POST' | 'PUT' | 'DELETE';
  key: any;
  body: any;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export class BarDatabase extends Dexie {
  reservations!: Table<Reservation>;
  tombstones!: Table<Tombstone>;
  outbox!: Table<OutboxEntry>;
  products!: Table<Product>;
  orders!: Table<Order>;
  expenses!: Table<Expense>;
  config!: Table<BusinessConfig>;
  // NOTE: Cannot use 'tables' — it's a reserved property in Dexie.
  // Using 'salonTables' instead.
  salonTables!: Table<TableState>;
  paymentOrders!: Table<PaymentOrder>;
  systemLogs!: Table<SystemLog>;
  auditLogs!: Table<AuditLog>;
  comandas!: Table<Comanda>;
  rewards!: Table<Reward>;
  customers!: Table<Customer>;
  shifts!: Table<Shift>;
  users!: Table<User>;
  messages!: Table<Message>;
  floorPlans!: Table<FloorPlan>;
  loyaltyConfig!: Table<LoyaltyConfig>;
  loyaltyTransactions!: Table<LoyaltyTransaction>;
  clientOrders!: Table<ClientOrder>;
  billingDrafts!: Table<BillingDraft>;
  mugs!: Table<Mug>;
  lockers!: Table<Locker>;
  mugFills!: Table<MugFill>;

  constructor() {
    super('BarDatabase');
    this.version(10).stores({
      products: '++id, name, sku, category',
      orders: '++id, tableId, status, timestamp',
      expenses: '++id, provider, date, category',
      config: 'id',
      salonTables: 'id',
      paymentOrders: '++id, provider, status, date',
      systemLogs: '++id, level, timestamp',
      auditLogs: '++id, userId, action, module, timestamp',
      comandas: '++id, tableId, status, timestamp',
      rewards: '++id, name, pointsCost',
      customers: '++id, dni, name',
      shifts: '++id, endTime, status',
      users: '++id, name, role',
      messages: '++id, timestamp, senderRole, status',
      floorPlans: '++id, name, timestamp',
      loyaltyConfig: 'id',
      loyaltyTransactions: '++id, customerDni, timestamp',
      clientOrders: '++id, tableId, status, timestamp',
      billingDrafts: 'id, date, billed'
    });

    // v11: updatedAt indexado para sync incremental, registro de borrados y cola offline
    this.version(11).stores({
      products: '++id, name, sku, category, updatedAt',
      orders: '++id, tableId, status, timestamp, updatedAt',
      expenses: '++id, provider, date, category, updatedAt',
      config: 'id',
      salonTables: 'id, updatedAt',
      paymentOrders: '++id, provider, status, date, updatedAt',
      systemLogs: '++id, level, timestamp',
      auditLogs: '++id, userId, action, module, timestamp',
      comandas: '++id, tableId, status, timestamp, updatedAt',
      rewards: '++id, name, pointsCost, updatedAt',
      customers: '++id, dni, name, updatedAt',
      shifts: '++id, endTime, status, updatedAt',
      users: '++id, name, role, updatedAt',
      messages: '++id, timestamp, senderRole, status, updatedAt',
      floorPlans: '++id, name, timestamp, updatedAt',
      loyaltyConfig: 'id, updatedAt',
      loyaltyTransactions: '++id, customerDni, timestamp, updatedAt',
      clientOrders: '++id, tableId, status, timestamp, updatedAt',
      billingDrafts: 'id, date, billed, updatedAt',
      tombstones: '++id, table, deletedAt',
      outbox: '++id, table, createdAt'
    }).upgrade(async tx => {
      const epoch = new Date(0).toISOString();
      for (const name of ['products', 'orders', 'expenses', 'salonTables', 'paymentOrders', 'comandas',
        'rewards', 'customers', 'shifts', 'users', 'messages', 'floorPlans', 'loyaltyConfig',
        'loyaltyTransactions', 'clientOrders', 'billingDrafts']) {
        await tx.table(name).toCollection().modify((r: any) => { if (!r.updatedAt) r.updatedAt = epoch; });
      }
    });

    // v12: reservas
    this.version(12).stores({
      reservations: '++id, date, status, tableId, updatedAt'
    });

    // v13: vasos propios, lockers y recargas
    this.version(13).stores({
      mugs: '++id, &code, customerDni, status, lockerId, updatedAt',
      lockers: '++id, &label, status, customerDni, updatedAt',
      mugFills: '++id, mugId, ownerDni, timestamp, updatedAt'
    });
  }
}

export const db = new BarDatabase();

export const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
// El host principal es la aplicación de Electron. Se detecta por el puente IPC del preload,
// que no se puede falsificar desde un navegador cambiando el user-agent.
export const isHost = !!getIpc();

// ---------------------------------------------------------------------------
// SINCRONIZACIÓN
// Tablas que se replican entre la PC principal (host) y celulares/tablets.
// ---------------------------------------------------------------------------
export const SYNCED_TABLES = [
  'products', 'orders', 'expenses', 'salonTables', 'paymentOrders',
  'comandas', 'rewards', 'customers', 'shifts', 'users', 'messages',
  'floorPlans', 'loyaltyConfig', 'loyaltyTransactions', 'clientOrders', 'billingDrafts',
  'reservations', 'mugs', 'lockers', 'mugFills'
] as const;

// Tablas que los dispositivos remotos escriben en el host (incluye logs, que no se descargan)
const REMOTE_WRITE_TABLES: string[] = [...SYNCED_TABLES, 'systemLogs', 'auditLogs'];

const resolveKey = (table: any, id: any) => {
  if (id === undefined || id === null || id === '') return null;
  // Las tablas autoincrementales usan claves numéricas; el resto (mesas, borradores) son strings
  return table.schema.primKey.auto && !isNaN(Number(id)) ? Number(id) : id;
};

// 1. EN EL HOST (ELECTRON): marca de tiempo en cada cambio, registro de borrados,
//    aviso al proceso principal (para notificar por SSE) y atención de consultas remotas.
if (isHost) {
  const ipc = getIpc()!;

  const pendingNotify = new Map<string, ReturnType<typeof setTimeout>>();
  const notifyChange = (table: string) => {
    if (pendingNotify.has(table)) return;
    pendingNotify.set(table, setTimeout(() => {
      pendingNotify.delete(table);
      ipc.send('db-changed', table);
    }, 120));
  };

  for (const name of SYNCED_TABLES) {
    const t = (db as any)[name] as Table<any>;
    t.hook('creating', function (this: any, _pk: any, obj: any) {
      obj.updatedAt = new Date().toISOString();
      this.onsuccess = () => {
        notifyChange(name);
        // Comandas nuevas (de esta PC o de los celulares): impresión automática por estación
        if (name === 'comandas') {
          const comanda = { tableId: obj.tableId, items: obj.items };
          setTimeout(() => {
            import('../lib/printing')
              .then(m => m.printComanda(comanda, { onlyIfAuto: true }))
              .catch(err => console.error('No se pudo imprimir la comanda', err));
          }, 0);
        }
      };
    });
    t.hook('updating', function (this: any) {
      this.onsuccess = () => notifyChange(name);
      return { updatedAt: new Date().toISOString() };
    });
    t.hook('deleting', function (this: any, pk: any) {
      this.onsuccess = () => {
        Dexie.ignoreTransaction(() =>
          db.tombstones.add({ table: name, key: pk, deletedAt: new Date().toISOString() })
        ).catch(err => console.error('No se pudo registrar el borrado', name, pk, err));
        notifyChange(name);
      };
    });
  }

  // Limpieza de registros de borrado viejos (los clientes hacen sync completo periódicamente)
  setTimeout(() => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    db.tombstones.where('deletedAt').below(cutoff).delete().catch(() => {});
  }, 60_000);

  // Cuando Express recibe una llamada HTTP de un celular, la envía aquí vía IPC.
  // Este código consulta el IndexedDB real de la PC principal y devuelve el resultado.
  ipc.on('db-request', async (_: any, { requestId, table, id, method, body, query }: any) => {
    try {
      const targetTable = (db as any)[table];
      if (!targetTable || !db.tables.some(t => t.name === table)) throw new Error(`Table ${table} not found`);

      let data;
      const key = resolveKey(targetTable, id);
      const pk = targetTable.schema.primKey.name || 'id';

      if (method === 'SYNC') {
        // Cambios desde una fecha (o todo, si no hay fecha) + claves borradas
        const now = new Date().toISOString();
        const since = query && query.since ? String(query.since) : '';
        if (!since) {
          data = { now, full: true, records: await targetTable.toArray(), deleted: [] };
        } else {
          const records = await targetTable.where('updatedAt').above(since).toArray();
          const deleted = (await db.tombstones.where('deletedAt').above(since).toArray())
            .filter(t => t.table === table)
            .map(t => t.key);
          data = { now, full: false, records, deleted };
        }
      } else if (method === 'GET') {
        if (key !== null) {
          data = await targetTable.get(key);
        } else if (query && query.where && query.equals !== undefined) {
          data = await targetTable.where(query.where).equals(query.equals).toArray();
        } else if (query && query.orderBy) {
          data = query.reverse === 'true'
            ? await targetTable.orderBy(query.orderBy).reverse().toArray()
            : await targetTable.orderBy(query.orderBy).toArray();
        } else {
          data = await targetTable.toArray();
        }
      } else if (method === 'POST') {
        const record = { ...(body || {}) };
        delete record.updatedAt;
        // En tablas autoincrementales el host asigna el id (evita choques entre dispositivos)
        if (targetTable.schema.primKey.auto) delete record[pk];
        data = await targetTable.add(record);
      } else if (method === 'PUT') {
        const changes = { ...(body || {}) };
        delete changes.updatedAt;
        delete changes[pk];
        data = await targetTable.update(key, changes);
      } else if (method === 'DELETE') {
        data = await targetTable.delete(key);
      }

      ipc.send('db-response', { requestId, success: true, data });
    } catch (err: any) {
      console.error('Error procesando consulta remota de base de datos:', err);
      ipc.send('db-response', { requestId, success: false, error: err.message });
    }
  });
}

// 2. EN CELULARES/TABLETS: las escrituras se aplican localmente (respuesta instantánea)
//    y se encolan en `outbox` para enviarlas al host, con reintentos si no hay conexión.
type OutboxListener = (pending: number) => void;
const outboxListeners = new Set<OutboxListener>();
export function onOutboxChange(fn: OutboxListener) {
  outboxListeners.add(fn);
  return () => { outboxListeners.delete(fn); };
}
const emitOutbox = async () => {
  if (outboxListeners.size === 0) return;
  const n = await Dexie.ignoreTransaction(() => db.outbox.count());
  outboxListeners.forEach(fn => fn(n));
};

/** Claves con cambios todavía no confirmados por el host (la sync no debe pisarlas) */
export async function getPendingKeys(table: string): Promise<Set<any>> {
  const entries = await Dexie.ignoreTransaction(() => db.outbox.where('table').equals(table).toArray());
  return new Set(entries.map(e => e.key));
}

async function remapLocalKey(tableName: string, oldKey: any, newKey: any) {
  const t = (db as any)[tableName];
  const idKey = t.schema.primKey.name || 'id';
  await db.transaction('rw', [t, db.outbox], async () => {
    const rec = await t.get(oldKey);
    if (rec) {
      await (t.originalDelete || t.delete.bind(t))(oldKey);
      await t.put({ ...rec, [idKey]: newKey });
    }
    // Las operaciones siguientes sobre el mismo registro apuntan al id nuevo
    await db.outbox.where('table').equals(tableName).modify((e: OutboxEntry) => {
      if (e.key === oldKey) e.key = newKey;
    });
  });
}

let flushing: Promise<void> | null = null;

/** Envía al host las escrituras pendientes, en orden. Se detiene ante errores de red. */
export function flushOutbox(): Promise<void> {
  if (isHost || isPublicClientRoute()) return Promise.resolve();
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      while (true) {
        const entry = await db.outbox.orderBy('id').first();
        if (!entry) break;
        const localTable = (db as any)[entry.table];
        const path = entry.method === 'POST' || entry.key === null || entry.key === undefined
          ? `/api/db/${entry.table}`
          : `/api/db/${entry.table}/${encodeURIComponent(String(entry.key))}`;
        try {
          const result = await apiFetch(path, {
            method: entry.method,
            body: entry.method === 'DELETE' ? undefined : JSON.stringify(entry.body ?? {}),
          });
          await db.outbox.delete(entry.id!);
          // Alta en tabla autoincremental: el host asignó el id definitivo -> remapear localmente
          if (entry.method === 'POST' && localTable?.schema.primKey.auto && result != null && result !== entry.key) {
            await remapLocalKey(entry.table, entry.key, result);
          }
        } catch (err: any) {
          const status = err?.status;
          if (status && status >= 400 && status < 500 && ![401, 408, 429].includes(status)) {
            // Rechazo definitivo (permisos/validación): se descarta para no bloquear la cola
            console.error(`Cambio rechazado por el host (${entry.method} ${entry.table}):`, err.message);
            await db.outbox.delete(entry.id!);
            continue;
          }
          const attempts = (entry.attempts || 0) + 1;
          if (status && status >= 500 && attempts >= 10) {
            // El host responde pero falla siempre con este cambio: se descarta para no trabar la cola
            console.error(`Cambio descartado tras ${attempts} errores del host (${entry.method} ${entry.table}):`, err.message);
            await db.outbox.delete(entry.id!);
            continue;
          }
          await db.outbox.update(entry.id!, { attempts, lastError: String(err?.message || err) });
          break; // sin conexión: se reintenta en el próximo ciclo
        }
      }
    } finally {
      flushing = null;
      emitOutbox().catch(() => {});
    }
  })();
  return flushing;
}

if (!isHost) {
  // Dentro de una transacción Dexie no se puede escribir en `outbox` (no está en el scope)
  // ni esperar un fetch (PrematureCommitError): se acumula y se encola al confirmarse.
  const txQueues = new WeakMap<object, OutboxEntry[]>();

  const enqueue = (entry: OutboxEntry): Promise<void> => {
    const tx = (Dexie as any).currentTransaction;
    if (tx) {
      let queue = txQueues.get(tx);
      if (!queue) {
        const q: OutboxEntry[] = [];
        queue = q;
        txQueues.set(tx, q);
        tx.on('complete', () => {
          Dexie.ignoreTransaction(() => db.outbox.bulkAdd(q))
            .then(() => { emitOutbox(); return flushOutbox(); })
            .catch(err => console.error('No se pudieron encolar cambios', err));
        });
      }
      queue.push(entry);
      return Promise.resolve();
    }
    return Dexie.ignoreTransaction(() => db.outbox.add(entry))
      .then(() => { emitOutbox(); flushOutbox(); });
  };

  const wrapTableForClient = (tableName: string, originalTable: any) => {
    const idKey = originalTable.schema.primKey.name || 'id';
    const now = () => new Date().toISOString();

    // Interceptar ADD
    const originalAdd = originalTable.add.bind(originalTable);
    originalTable.originalAdd = originalAdd;
    originalTable.add = async function(item: any, key?: any) {
      const localId = await originalAdd(item, key);
      const itemWithId = { ...item };
      if (localId !== undefined && itemWithId[idKey] === undefined) itemWithId[idKey] = localId;

      if (isPublicClientRoute()) {
        // Comensal sin login (carta QR): solo puede enviar pedidos por la ruta pública.
        // Si falla, el error se propaga para que el comensal sepa que su pedido no llegó.
        if (tableName === 'clientOrders') {
          await apiFetch('/api/public/client-orders', { method: 'POST', body: JSON.stringify(itemWithId) });
        }
        return localId;
      }
      await enqueue({ table: tableName, method: 'POST', key: localId, body: itemWithId, createdAt: now(), attempts: 0 });
      return localId;
    };

    // Interceptar UPDATE
    const originalUpdate = originalTable.update.bind(originalTable);
    originalTable.originalUpdate = originalUpdate;
    originalTable.update = async function(key: any, changes: any) {
      const localResult = await originalUpdate(key, changes);
      if (isPublicClientRoute()) return localResult;
      await enqueue({ table: tableName, method: 'PUT', key, body: changes, createdAt: now(), attempts: 0 });
      return localResult;
    };

    // Interceptar DELETE
    const originalDelete = originalTable.delete.bind(originalTable);
    originalTable.originalDelete = originalDelete;
    originalTable.delete = async function(key: any) {
      const localResult = await originalDelete(key);
      if (isPublicClientRoute()) return localResult;
      await enqueue({ table: tableName, method: 'DELETE', key, body: null, createdAt: now(), attempts: 0 });
      return localResult;
    };
  };

  REMOTE_WRITE_TABLES.forEach(name => {
    if ((db as any)[name]) {
      wrapTableForClient(name, (db as any)[name]);
    }
  });
}
