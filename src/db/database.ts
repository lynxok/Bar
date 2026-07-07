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

  constructor() {
    super('BarDatabase');
    this.version(9).stores({
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
      clientOrders: '++id, tableId, status, timestamp'
    });
  }
}

export const db = new BarDatabase();

