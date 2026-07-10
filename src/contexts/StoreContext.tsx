import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product, TableState as Table, LoyaltyConfig, LoyaltyTransaction, Shift, ClientOrder, BillingDraft } from '../db/database';
export type { Table, LoyaltyConfig, LoyaltyTransaction, Shift, ClientOrder, BillingDraft };

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

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

  closeOrder: (tableId: string, paymentMethod: string, customerId?: string) => Promise<void>;
  closePOSOrder: (items: OrderItem[], total: number, paymentMethod: string, customerId?: string) => Promise<void>;
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

const StoreContext = createContext<StoreContextType | undefined>(undefined);

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

  const tables = tablesFromDB.length > 0 ? tablesFromDB : defaultTables;

  useEffect(() => {
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

      const carlosExists = await db.users.where('name').equals('Carlos').first();
      if (!carlosExists) {
        await db.users.add({
          name: 'Carlos',
          role: 'Mozo',
          pin: '1234',
          permissions: ['tables', 'pos'],
          status: 'Active'
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
    await db.salonTables.delete(id);
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
    await db.products.delete(id);
  };

  const updateTableOrder = async (tableId: string, items: OrderItem[]) => {
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

    const totals = shiftOrders.reduce((acc, order) => {
      const method = order.paymentMethod?.toLowerCase() || '';
      if (method.includes('efectivo')) acc.cash += order.total;
      else if (method.includes('tarjeta')) acc.card += order.total;
      else if (method.includes('transferencia') || method.includes('mercado')) acc.transfer += order.total;
      else acc.cash += order.total;
      return acc;
    }, { cash: 0, card: 0, transfer: 0 });

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
  const closeOrder = async (tableId: string, paymentMethod: string, customerId?: string) => {
    await db.transaction('rw', [db.salonTables, db.orders, db.customers, db.products, db.loyaltyTransactions, db.loyaltyConfig, db.billingDrafts], async () => {
      const table = await db.salonTables.get(tableId);
      if (!table || table.order.length === 0) return;
      const total = table.order.reduce((acc: number, i: any) => acc + (i.price * i.qty), 0);
      
      await db.orders.add({
        tableId,
        items: table.order,
        total,
        paymentMethod,
        customerId,
        status: 'closed',
        timestamp: new Date().toISOString()
      });

      let clientName = 'Mesa ' + tableId.replace('T-', '');
      if (customerId) {
        const customer = await db.customers.where('dni').equals(customerId).first();
        if (customer) clientName = customer.name;
      }

      const itemsList = table.order.map((i: any) => `${i.qty}x ${i.name}`).join(', ');
      
      await db.billingDrafts.add({
        id: Math.random().toString(36).substring(7),
        date: new Date().toISOString(),
        clientName,
        concept: itemsList,
        paymentMethod,
        amount: total,
        billed: false
      });

      if (customerId) {
        const customer = await db.customers.where('dni').equals(customerId).first();
        if (customer) {
          // Calculate loyalty points using config and active promotions
          const config = await db.loyaltyConfig.get('global');
          let basePoints = Math.floor(total / 100);
          let multiplier = 1;
          const nowStr = new Date().toISOString().split('T')[0];

          if (config && config.promotions) {
            config.promotions.forEach(p => {
              if (p.active) {
                const startOk = !p.startDate || nowStr >= p.startDate;
                const endOk = !p.endDate || nowStr <= p.endDate;
                if (startOk && endOk) {
                  multiplier = Math.max(multiplier, p.multiplier);
                }
              }
            });
          }

          const earnedPoints = Math.floor(basePoints * multiplier);
          await db.customers.update(customer.id!, { points: (customer.points || 0) + earnedPoints });

          // Save loyalty transaction record
          await db.loyaltyTransactions.add({
            customerDni: customer.dni,
            customerName: customer.name,
            type: 'purchase',
            points: earnedPoints,
            description: `Compra Mesa ${tableId.replace('T-', '')} - Pago ${paymentMethod}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Deduct product stock
      for (const item of table.order) {
        const product = await db.products.where('name').equals(item.name).first();
        if (product && product.id != null) {
          const newStock = Math.max(0, (product.stock || 0) - (item.qty || 1));
          await db.products.update(product.id, { stock: newStock });
        }
      }

      await db.salonTables.update(tableId, {
        order: [],
        status: 'available',
        lastUpdate: new Date().toISOString()
      });
    });
  };

  const closePOSOrder = async (items: OrderItem[], total: number, paymentMethod: string, customerId?: string) => {
    await db.transaction('rw', [db.orders, db.customers, db.products, db.loyaltyTransactions, db.loyaltyConfig, db.billingDrafts], async () => {
      if (items.length === 0) return;

      await db.orders.add({
        tableId: 'POS_FAST',
        items,
        total,
        paymentMethod,
        customerId,
        status: 'closed',
        timestamp: new Date().toISOString()
      });

      let clientName = 'Consumidor Final';
      if (customerId) {
        const customer = await db.customers.where('dni').equals(customerId).first();
        if (customer) clientName = customer.name;
      }

      const itemsList = items.map((i: any) => `${i.qty}x ${i.name}`).join(', ');

      await db.billingDrafts.add({
        id: Math.random().toString(36).substring(7),
        date: new Date().toISOString(),
        clientName,
        concept: itemsList,
        paymentMethod,
        amount: total,
        billed: false
      });

      if (customerId) {
        const customer = await db.customers.where('dni').equals(customerId).first();
        if (customer) {
          const config = await db.loyaltyConfig.get('global');
          let basePoints = Math.floor(total / 100);
          let multiplier = 1;
          const nowStr = new Date().toISOString().split('T')[0];

          if (config && config.promotions) {
            config.promotions.forEach(p => {
              if (p.active) {
                const startOk = !p.startDate || nowStr >= p.startDate;
                const endOk = !p.endDate || nowStr <= p.endDate;
                if (startOk && endOk) {
                  multiplier = Math.max(multiplier, p.multiplier);
                }
              }
            });
          }

          const earnedPoints = Math.floor(basePoints * multiplier);
          await db.customers.update(customer.id!, { points: (customer.points || 0) + earnedPoints });

          // Save loyalty transaction record
          await db.loyaltyTransactions.add({
            customerDni: customer.dni,
            customerName: customer.name,
            type: 'purchase',
            points: earnedPoints,
            description: `Venta POS Rápida - Pago ${paymentMethod}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Deduct product stock
      for (const item of items) {
        const product = await db.products.where('name').equals(item.name).first();
        if (product && product.id != null) {
          const newStock = Math.max(0, (product.stock || 0) - (item.qty || 1));
          await db.products.update(product.id, { stock: newStock });
        }
      }
    });
  };

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
          const product = await db.products.where('name').equals(item.name).first();
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
  };

  const addUser = async (user: any) => {
    await db.users.add(user);
  };

  const updateUser = async (id: number, user: any) => {
    await db.users.update(id, user);
  };

  const deleteUser = async (id: number) => {
    await db.users.delete(id);
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
    await db.floorPlans.delete(id);
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

  return (
    <StoreContext.Provider value={{
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
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
}
