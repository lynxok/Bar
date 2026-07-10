import Dexie, { type Table } from 'dexie';

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
  popular: boolean;
  status: string;
  prepCount?: number;
  prepTimeTotal?: number;
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
}

export interface User {
  id?: number;
  name: string;
  role: string;
  pin?: string;
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

export class BarDatabase extends Dexie {
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
  }
}

export const db = new BarDatabase();

export const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
// El host principal es la aplicación de Electron.
export const isHost = isElectron;

// 1. ESCUCHADOR IPC EN EL HOST (ELECTRON)
// Cuando Express recibe una llamada HTTP de un celular, la envía aquí vía IPC.
// Este código consulta el IndexedDB real de la PC principal y devuelve el resultado.
if (isElectron) {
  const ipc = (window as any).require('electron').ipcRenderer;
  ipc.on('db-request', async (_: any, { requestId, table, id, method, body, query }: any) => {
    try {
      const targetTable = (db as any)[table];
      if (!targetTable) throw new Error(`Table ${table} not found`);

      let data;
      const key = id ? (isNaN(Number(id)) ? id : Number(id)) : null;

      if (method === 'GET') {
        if (key !== null) {
          data = await targetTable.get(key);
        } else {
          // Filtrado básico para consultas comunes
          if (query && query.where && query.equals) {
            data = await targetTable.where(query.where).equals(query.equals).toArray();
          } else if (query && query.orderBy) {
            if (query.reverse === 'true') {
              data = await targetTable.orderBy(query.orderBy).reverse().toArray();
            } else {
              data = await targetTable.orderBy(query.orderBy).toArray();
            }
          } else {
            data = await targetTable.toArray();
          }
        }
      } else if (method === 'POST') {
        data = await targetTable.add(body);
      } else if (method === 'PUT') {
        data = await targetTable.update(key, body);
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

// 2. INTERCEPTORES DE ESCRITURA EN EL CLIENTE (CELULARES/TABLETS)
// Cuando el celular hace una operación de escritura (add, update, delete) en Dexie,
// se ejecuta localmente (para feedback visual instantáneo) y se envía al Host por HTTP API.
if (!isHost) {
  const apiFetch = async (path: string, options?: RequestInit) => {
    const hostUrl = window.location.origin;
    const res = await fetch(`${hostUrl}${path}`, options);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const wrapTableForClient = (tableName: string, originalTable: any) => {
    // Interceptar ADD
    const originalAdd = originalTable.add.bind(originalTable);
    originalTable.originalAdd = originalAdd;
    originalTable.add = async function(item: any, key?: any) {
      const localId = await originalAdd(item, key);
      const itemWithId = { ...item };
      
      const idKey = originalTable.schema.primKey.name || 'id';
      if (localId && !itemWithId[idKey]) {
        itemWithId[idKey] = localId;
      }
      
      try {
        await apiFetch(`/api/db/${tableName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemWithId)
        });
      } catch (err) {
        console.error(`Error de sincronización (ADD) en tabla ${tableName}:`, err);
      }
      return localId;
    };

    // Interceptar UPDATE
    const originalUpdate = originalTable.update.bind(originalTable);
    originalTable.originalUpdate = originalUpdate;
    originalTable.update = async function(key: any, changes: any) {
      const localResult = await originalUpdate(key, changes);
      try {
        await apiFetch(`/api/db/${tableName}/${key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes)
        });
      } catch (err) {
        console.error(`Error de sincronización (UPDATE) en tabla ${tableName}:`, err);
      }
      return localResult;
    };

    // Interceptar DELETE
    const originalDelete = originalTable.delete.bind(originalTable);
    originalTable.originalDelete = originalDelete;
    originalTable.delete = async function(key: any) {
      const localResult = await originalDelete(key);
      try {
        await apiFetch(`/api/db/${tableName}/${key}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.error(`Error de sincronización (DELETE) en tabla ${tableName}:`, err);
      }
      return localResult;
    };
  };

  const tableNames = [
    'products', 'orders', 'expenses', 'salonTables', 'paymentOrders', 
    'systemLogs', 'auditLogs', 'comandas', 'rewards', 'customers', 
    'shifts', 'users', 'messages', 'floorPlans', 'loyaltyConfig', 
    'loyaltyTransactions', 'clientOrders'
  ];
  
  tableNames.forEach(name => {
    if ((db as any)[name]) {
      wrapTableForClient(name, (db as any)[name]);
    }
  });
}
