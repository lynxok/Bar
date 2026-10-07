import { createContext, useContext, ReactNode, useEffect, useLayoutEffect, useState } from 'react';
import { sumByPaymentBucket } from '../lib/payments';
import { createTrackedStore, useTrackedStore, type TrackedStore } from './trackedStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, isHost, Product, TableState as Table, LoyaltyConfig, LoyaltyTransaction, Shift, ClientOrder, BillingDraft } from '../db/database';
import { getIpc } from '../lib/ipc';
import { getStoredUser } from '../lib/auth';
import { LoggerService } from '../lib/LoggerService';
export type { Table, LoyaltyConfig, LoyaltyTransaction, Shift, ClientOrder, BillingDraft };

export type { OrderItem, CloseOrderOptions } from '../services/sales';
import type { OrderItem, CloseOrderOptions } from '../services/sales';
import { closeOrder, closePOSOrder, findProductForItem } from '../services/sales';

export interface Expense {
  id?: number;
  provider: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

export interface PaymentOrder {
  id?: number;
  provider: string;
  amount: number;
  date: string;
  status: 'Pendiente' | 'Pagado';
}

interface StoreContextType {
  products: Product[];
  tables: Table[];
  expenses: Expense[];
  paymentOrders: PaymentOrder[];
  orders: any[];
  comandas: any[];
  rewards: any[];
  customers: any[];
  shifts: Shift[];
  users: any[];
  messages: any[];
  floorPlans: any[];
  loyaltyConfig: LoyaltyConfig | null;
  loyaltyTransactions: LoyaltyTransaction[];
  activeShift: Shift | null;
  clientOrders: ClientOrder[];
  billingDrafts: BillingDraft[];

  submitClientOrder: (tableId: string, customerId: string, items: any[], total: number) => Promise<void>;
  approveClientOrder: (orderId: number) => Promise<void>;
  rejectClientOrder: (orderId: number) => Promise<void>;
  saveFloorPlan: (name: string) => Promise<void>;
  loadFloorPlan: (id: number) => Promise<void>;
  deleteFloorPlan: (id: number) => Promise<void>;
  setDefaultFloorPlan: (id: number) => Promise<void>;
  sendMessage: (msg: any) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  addUser: (user: any) => Promise<void>;
  updateUser: (id: number, user: any) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
  addComanda: (tableId: string, items: any[]) => Promise<void>;
  updateComandaStatus: (id: number, status: string) => Promise<void>;
  addCustomer: (customer: any) => Promise<void>;
  updateCustomerPoints: (dni: string, points: number, description: string) => Promise<void>;
  redeemPoints: (dni: string, points: number, description: string) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  addPaymentOrder: (po: PaymentOrder) => Promise<void>;

  // Shift Management (Apertura/Cierre de Turnos)
  openShift: (cashierName: string, initialCash: number) => Promise<void>;
  closeShift: (declaredCash: number, comments: string) => Promise<void>;

  closeOrder: (tableId: string, paymentMethod: string, options?: string | CloseOrderOptions) => Promise<void>;
  closePOSOrder: (items: OrderItem[], total: number, paymentMethod: string, options?: string | CloseOrderOptions) => Promise<void>;
  updateTableOrder: (tableId: string, items: OrderItem[]) => Promise<void>;
  setProducts: (products: Product[]) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: number, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  moveTable: (id: string, x: number, y: number) => Promise<void>;
  addTable: (config: Partial<Table>) => Promise<void>;
  removeTable: (id: string) => Promise<void>;
  updateTable: (id: string, updates: Partial<Table>) => Promise<void>;

  // Loyalty Config persistence helpers
  updateLoyaltyConfig: (updates: Partial<LoyaltyConfig>) => Promise<void>;

  // Borradores y ARCA
  createBillingDraft: (clientName: string, concept: string, paymentMethod: string, amount: number) => Promise<string>;
  markDraftsAsBilled: (ids: string[], billingData: any) => Promise<void>;
}

const StoreContext = createContext<TrackedStore<StoreContextType> | undefined>(undefined);

const INITIAL_TIERS = [
  { name: 'Bronze', minPoints: 0, color: 'orange' },
  { name: 'Silver', minPoints: 500, color: 'slate' },
  { name: 'Gold', minPoints: 1500, color: 'amber' },
  { name: 'Platinum', minPoints: 3500, color: 'indigo' },
];

export function StoreProvider({ children }: { children: ReactNode }) {
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const expenses = useLiveQuery(() => db.expenses.toArray()) || [];
  const paymentOrders = useLiveQuery(() => db.paymentOrders.toArray()) || [];
  const orders = useLiveQuery(() => db.orders.orderBy('id').reverse().toArray()) || [];
  const tablesFromDB = useLiveQuery(() => db.salonTables.toArray()) || [];
  const comandas = useLiveQuery(() => db.comandas.orderBy('id').reverse().toArray()) || [];
  const rewards = useLiveQuery(() => db.rewards.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const shifts = useLiveQuery(() => db.shifts.toArray()) || [];
  const users = useLiveQuery(() => db.users.toArray()) || [];
  const messages = useLiveQuery(() => db.messages.orderBy('timestamp').toArray()) || [];
  const floorPlans = useLiveQuery(() => db.floorPlans.orderBy('timestamp').reverse().toArray()) || [];
  const clientOrders = useLiveQuery(() => db.clientOrders.orderBy('timestamp').reverse().toArray()) || [];
  const billingDrafts = useLiveQuery(() => db.billingDrafts.orderBy('date').reverse().toArray()) || [];

  // Persistent Loyalty Config & Transactions from IndexedDB
  const loyaltyConfigRaw = useLiveQuery(() => db.loyaltyConfig.get('global'));
  const loyaltyTransactions = useLiveQuery(() => db.loyaltyTransactions.orderBy('timestamp').reverse().toArray()) || [];

  // Active shift derived from DB shifts
  const activeShift = shifts.find(s => s.status === 'active') || null;

  const loyaltyConfig: LoyaltyConfig = loyaltyConfigRaw || {
    id: 'global',
    pointValue: 0.005,
    tierConfig: INITIAL_TIERS,
    promotions: [],
  };

  const defaultTables: Table[] = [
    { id: 'T-01', status: 'available', order: [], lastUpdate: new Date().toISOString(), x: 100, y: 100, type: 'round', width: 80, height: 80, capacity: 4 },
    { id: 'T-02', status: 'available', order: [], lastUpdate: new Date().toISOString(), x: 300, y: 100, type: 'round', width: 80, height: 80, capacity: 4 },
    { id: 'T-03', status: 'available', order: [], lastUpdate: new Date().toISOString(), x: 500, y: 100, type: 'round', width: 80, height: 80, capacity: 6 },
    { id: 'T-04', status: 'available', order: [], lastUpdate: new Date().toISOString(), x: 100, y: 280, type: 'round', width: 80, height: 80, capacity: 4 },
  ];

  const tables = tablesFromDB;

  // Auditoría de acciones sensibles (anulaciones y borrados), con el usuario de la sesión
  const audit = (action: string, module: string, details: string) => {
    const u = getStoredUser();
    LoggerService.audit(action, module, details, String(u?.id ?? 'system'), u?.name ?? 'Sistema')
      .catch(err => console.error('No se pudo registrar la auditoría', err));
  };

  useEffect(() => {
    // Los datos iniciales solo se cargan en la PC principal: en celulares/tablets las tablas
    // arrancan vacías hasta la primera sync y no deben sembrar datos de ejemplo en el host.
    if (!isHost) return;
    const initTables = async () => {
      const tableCount = await db.salonTables.count();
      if (tableCount === 0) {
        const defaultPlan = await db.floorPlans.filter(fp => fp.isDefault === 1).first();
        if (defaultPlan) {
          await db.salonTables.bulkAdd(defaultPlan.tables);
        } else {
          await db.salonTables.bulkAdd(defaultTables);
        }
      }

      const rewardCount = await db.rewards.count();
      if (rewardCount === 0) {
        await db.rewards.bulkAdd([
          { name: 'Café de Regalo', pointsCost: 100 },
          { name: 'Postre Gratis', pointsCost: 300 },
          { name: '10% de Descuento', pointsCost: 500 },
          { name: 'Cena p/ 2 Personas', pointsCost: 2000 }
        ]);
      }

      const configCount = await db.loyaltyConfig.count();
      if (configCount === 0) {
        await db.loyaltyConfig.add({
          id: 'global',
          pointValue: 0.005,
          tierConfig: INITIAL_TIERS,
          promotions: [],
        });
      }
    };
    initTables().catch(console.error);
  }, []);

  const moveTable = async (id: string, x: number, y: number) => {
    await db.salonTables.update(id, { x, y });
  };

  const addTable = async (config: Partial<Table>) => {
    const newTable: Table = {
      id: config.id || `T-${Date.now()}`,
      status: 'available',
      order: [],
      lastUpdate: new Date().toISOString(),
      x: config.x ?? 150,
      y: config.y ?? 150,
      type: config.type || 'square',
      width: config.width || 80,
      height: config.height || 80,
      capacity: config.capacity ?? 4,
    };
    await db.salonTables.add(newTable);
  };

  const removeTable = async (id: string) => {
    const table = await db.salonTables.get(id);
    await db.salonTables.delete(id);
    if (table && table.order?.length) {
      audit('DELETE', 'MESAS', `Mesa ${id} eliminada con ${table.order.length} ítem(s) cargados`);
    }
  };

  const updateTable = async (id: string, updates: Partial<Table>) => {
    await db.salonTables.update(id, updates);
  };

  const addExpense = async (expense: Expense) => {
    await db.expenses.add(expense);
  };

  const addPaymentOrder = async (po: PaymentOrder) => {
    await db.paymentOrders.add(po);
  };

  const setProducts = async (newProducts: Product[]) => {
    await db.transaction('rw', db.products, async () => {
      await db.products.clear();
      const cleanProducts = newProducts.map(({ id, ...rest }) => {
        const clean: Product = {
          ...rest,
          popular: rest.popular ?? false,
          status: rest.status || 'active'
        };
        if (typeof id === 'number') {
          clean.id = id;
        }
        return clean;
      });
      await db.products.bulkAdd(cleanProducts);
    });
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    const { id, ...rest } = product as any;
    await db.products.add(rest);
  };

  const updateProduct = async (id: number, updates: Partial<Product>) => {
    await db.products.update(id, updates);
  };

  const deleteProduct = async (id: number) => {
    const product = await db.products.get(id);
    await db.products.delete(id);
    audit('DELETE', 'INVENTARIO', `Producto eliminado: ${product?.name ?? id} (stock ${product?.stock ?? '?'})`);
  };

  const updateTableOrder = async (tableId: string, items: OrderItem[]) => {
    // Anulaciones: ítems quitados (o con menor cantidad) de una mesa
    const prev = (await db.salonTables.get(tableId))?.order || [];
    const removed = prev
      .map((p: any) => {
        const now = items.find(i => i.id === p.id);
        return { name: p.name, qty: (p.qty || 1) - (now ? (now.qty || 1) : 0), price: p.price };
      })
      .filter(r => r.qty > 0);
    if (removed.length) {
      const detail = removed.map(r => `${r.qty}x ${r.name} ($${(r.qty * r.price).toFixed(2)})`).join(', ');
      audit('VOID', 'MESAS', `Anulado en mesa ${tableId.replace('T-', '')}: ${detail}`);
    }
    await db.salonTables.update(tableId, {
      order: items,
      status: items.length > 0 ? 'occupied_no_order' : 'available',
      lastUpdate: new Date().toISOString()
    });
  };

  // Shift Management
  const openShift = async (cashierName: string, initialCash: number) => {
    // Check if there is already an active shift
    const existing = await db.shifts.where('status').equals('active').first();
    if (existing) throw new Error('Ya hay un turno activo en curso.');

    const newShift: Shift = {
      cashierName,
      startTime: new Date().toISOString(),
      initialCash,
      expectedCash: initialCash,
      declaredCash: 0,
      difference: 0,
      cardTotal: 0,
      transferTotal: 0,
      comments: '',
      status: 'active',
    };
    await db.shifts.add(newShift);
  };

  const closeShift = async (declaredCash: number, comments: string) => {
    const active = await db.shifts.where('status').equals('active').first();
    if (!active) throw new Error('No hay ningún turno activo para cerrar.');

    // Calculate current totals from orders processed since shift start
    const shiftStart = new Date(active.startTime);
    const shiftOrders = await db.orders
      .filter(o => new Date(o.timestamp) >= shiftStart && o.status === 'closed')
      .toArray();

    const totals = sumByPaymentBucket(shiftOrders);

    const expectedCash = active.initialCash + totals.cash;
    const difference = declaredCash - expectedCash;

    await db.shifts.update(active.id!, {
      endTime: new Date().toISOString(),
      expectedCash,
      declaredCash,
      difference,
      cardTotal: totals.card,
      transferTotal: totals.transfer,
      comments,
      status: 'closed',
    });
  };

  // Close order and deduct stock + add points and transaction logs
  const addComanda = async (tableId: string, items: any[]) => {
    if (!items || items.length === 0) return;
    await db.comandas.add({
      tableId,
      items,
      status: 'pending',
      timestamp: new Date().toISOString()
    });
  };

  const updateComandaStatus = async (id: number, status: any) => {
    await db.transaction('rw', [db.comandas, db.products], async () => {
      const comanda = await db.comandas.get(id);
      if (comanda && status === 'ready' && comanda.status !== 'ready') {
        const elapsedMinutes = (Date.now() - new Date(comanda.timestamp).getTime()) / 60000;
        
        for (const item of comanda.items) {
          const product = await findProductForItem(item);
          if (product && product.id) {
            const prepCount = (product.prepCount || 0) + 1;
            const prepTimeTotal = (product.prepTimeTotal || 0) + elapsedMinutes;
            await db.products.update(product.id, { prepCount, prepTimeTotal });
          }
        }
      }
      await db.comandas.update(id, { status });
    });
  };

  const addCustomer = async (customer: any) => {
    const existing = await db.customers.where('dni').equals(customer.dni).first();
    if (existing) throw new Error(`Ya existe un cliente con DNI ${customer.dni}`);
    await db.customers.add({ ...customer, points: 0 });
  };

  const updateCustomerPoints = async (dni: string, points: number, description: string) => {
    await db.transaction('rw', [db.customers, db.loyaltyTransactions], async () => {
      const customer = await db.customers.where('dni').equals(dni).first();
      if (customer) {
        await db.customers.update(customer.id!, { points: (customer.points || 0) + points });
        await db.loyaltyTransactions.add({
          customerDni: customer.dni,
          customerName: customer.name,
          type: 'adjustment',
          points,
          description,
          timestamp: new Date().toISOString(),
        });
      }
    });
  };

  const redeemPoints = async (dni: string, points: number, description: string) => {
    await db.transaction('rw', [db.customers, db.loyaltyTransactions], async () => {
      const customer = await db.customers.where('dni').equals(dni).first();
      if (customer) {
        const currentPoints = customer.points || 0;
        if (currentPoints >= points) {
          await db.customers.update(customer.id!, { points: currentPoints - points });
          await db.loyaltyTransactions.add({
            customerDni: customer.dni,
            customerName: customer.name,
            type: 'redemption',
            points: -points,
            description,
            timestamp: new Date().toISOString(),
          });
          console.log(`✅ Canje exitoso para ${dni}: -${points} pts`);
        } else {
          throw new Error('Puntos insuficientes');
        }
      }
    });
  };

  const updateLoyaltyConfig = async (updates: Partial<LoyaltyConfig>) => {
    const config = await db.loyaltyConfig.get('global');
    if (config) {
      await db.loyaltyConfig.update('global', updates);
    }
  };

  const submitClientOrder = async (tableId: string, customerId: string, items: any[], total: number) => {
    await db.clientOrders.add({
      tableId,
      customerId,
      items,
      total,
      status: 'pending',
      timestamp: new Date().toISOString()
    });
  };

  const approveClientOrder = async (orderId: number) => {
    await db.transaction('rw', [db.clientOrders, db.salonTables, db.comandas], async () => {
      const clientOrder = await db.clientOrders.get(orderId);
      if (!clientOrder) throw new Error(`Client order ${orderId} not found`);
      
      const table = await db.salonTables.get(clientOrder.tableId);
      if (!table) throw new Error(`Table ${clientOrder.tableId} not found`);

      const currentOrderItems: OrderItem[] = Array.isArray(table.order) ? [...table.order] : [];
      
      for (const item of clientOrder.items) {
        const existingItem = currentOrderItems.find(
          (i) => i.name === item.name || (i.id && item.id && i.id === item.id)
        );
        if (existingItem) {
          existingItem.qty += (item.qty || 1);
        } else {
          currentOrderItems.push({
            id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            productId: item.productId,
            name: item.name,
            price: item.price,
            qty: item.qty || 1
          });
        }
      }

      await db.salonTables.update(clientOrder.tableId, {
        order: currentOrderItems,
        status: 'occupied_no_order',
        lastUpdate: new Date().toISOString()
      });

      await db.comandas.add({
        tableId: clientOrder.tableId,
        items: clientOrder.items,
        status: 'pending',
        timestamp: new Date().toISOString()
      });

      await db.clientOrders.update(orderId, { status: 'approved' });
    });
  };

  const rejectClientOrder = async (orderId: number) => {
    await db.clientOrders.update(orderId, { status: 'rejected' });
    audit('REJECT', 'PEDIDOS QR', `Pedido QR #${orderId} rechazado`);
  };

  // En la PC principal la contraseña se hashea acá; en dispositivos remotos la hashea el servidor.
  const prepareUserPayload = async (user: any, isNew: boolean) => {
    const { passwordHash: _ignored, ...payload } = user || {};
    const ipc = getIpc();
    if (typeof payload.pin === 'string' && payload.pin.length > 0) {
      if (ipc) {
        payload.passwordHash = await ipc.invoke<string>('auth-hash-password', payload.pin);
        payload.pin = '';
      }
    } else if (!isNew) {
      delete payload.pin; // sin contraseña nueva: se conserva la actual
    }
    return payload;
  };

  const addUser = async (user: any) => {
    await db.users.add(await prepareUserPayload(user, true));
  };

  const updateUser = async (id: number, user: any) => {
    await db.users.update(id, await prepareUserPayload(user, false));
    await getIpc()?.invoke('auth-user-changed', id);
  };

  const deleteUser = async (id: number) => {
    await db.users.delete(id);
    await getIpc()?.invoke('auth-user-changed', id);
  };

  const sendMessage = async (msg: any) => {
    await db.messages.add({ ...msg, timestamp: new Date().toISOString(), status: 'sent' as const });
  };

  const markAsRead = async (id: number) => {
    await db.messages.update(id, { status: 'read' as const });
  };

  const saveFloorPlan = async (name: string) => {
    const currentTables = await db.salonTables.toArray();
    await db.floorPlans.add({
      name,
      tables: currentTables,
      timestamp: new Date().toISOString(),
      isDefault: 0
    });
  };

  const loadFloorPlan = async (id: number) => {
    const plan = await db.floorPlans.get(id);
    if (!plan) return;
    const sanitisedTables: Table[] = plan.tables.map((t: any) => ({
      id: t.id,
      status: (['available','occupied','occupied_no_order','waiting_food','consuming','checkout','dirty'].includes(t.status)
        ? t.status : 'available') as Table['status'],
      order: Array.isArray(t.order) ? t.order : [],
      lastUpdate: t.lastUpdate || new Date().toISOString(),
      x: t.x ?? 100,
      y: t.y ?? 100,
      type: t.type || 'square',
      width: t.width || 80,
      height: t.height || 80,
      capacity: t.capacity ?? 4,
      waiterName: t.waiterName,
      label: t.label,
    }));
    await db.transaction('rw', db.salonTables, async () => {
      await db.salonTables.clear();
      await db.salonTables.bulkAdd(sanitisedTables);
    });
  };

  const deleteFloorPlan = async (id: number) => {
    const plan = await db.floorPlans.get(id);
    await db.floorPlans.delete(id);
    audit('DELETE', 'MESAS', `Plano eliminado: ${plan?.name ?? id}`);
  };

  const setDefaultFloorPlan = async (id: number) => {
    await db.transaction('rw', db.floorPlans, async () => {
      const all = await db.floorPlans.toArray();
      for (const plan of all) {
        await db.floorPlans.update(plan.id!, { isDefault: plan.id === id ? 1 : 0 });
      }
    });
  };

  const createBillingDraft = async (clientName: string, concept: string, paymentMethod: string, amount: number) => {
    const id = Math.random().toString(36).substring(7);
    await db.billingDrafts.add({
      id,
      date: new Date().toISOString(),
      clientName,
      concept,
      paymentMethod,
      amount,
      billed: false
    });
    return id;
  };

  const markDraftsAsBilled = async (ids: string[], billingData: any) => {
    await db.transaction('rw', db.billingDrafts, async () => {
      for (const id of ids) {
        const draft = await db.billingDrafts.get(id);
        if (draft) {
          await db.billingDrafts.update(id, {
            billed: true,
            billingData: {
              ...draft.billingData,
              ...billingData
            }
          });
        }
      }
    });
  };

  const value: StoreContextType = {
      products, tables, expenses, paymentOrders, orders, comandas,
      rewards, customers, shifts, users, messages, floorPlans,
      loyaltyConfig, loyaltyTransactions, activeShift, clientOrders,
      billingDrafts,
      submitClientOrder, approveClientOrder, rejectClientOrder,
      saveFloorPlan, loadFloorPlan, deleteFloorPlan, setDefaultFloorPlan,
      sendMessage, markAsRead,
      addUser, updateUser, deleteUser,
      addComanda, updateComandaStatus,
      addCustomer, updateCustomerPoints, redeemPoints,
      addExpense, addPaymentOrder,
      openShift, closeShift,
      closeOrder, closePOSOrder, updateTableOrder,
      setProducts, addProduct, updateProduct, deleteProduct,
      moveTable, addTable, removeTable, updateTable,
      updateLoyaltyConfig,
      createBillingDraft, markDraftsAsBilled
    };

  // El contexto entrega un store estable; los consumidores se suscriben solo a lo que leen
  const [store] = useState(() => createTrackedStore(value));
  useLayoutEffect(() => { store.publish(value); });

  return (
    <StoreContext.Provider value={store}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextType {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used within a StoreProvider');
  return useTrackedStore<StoreContextType>(store);
}
