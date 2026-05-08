import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

// Types
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
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface Table {
  id: string;
  status: 'available' | 'occupied' | 'checkout';
  order: OrderItem[];
  lastUpdate: string;
  x: number;
  y: number;
  type: 'round' | 'square' | 'rectangle' | 'stool' | 'wall' | 'bar';
  width: number;
  height: number;
  capacity: number;
  rotation?: number; // degrees
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
  shifts: any[];
  users: any[];
  messages: any[];
  floorPlans: any[];
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
  updateCustomerPoints: (dni: string, points: number) => Promise<void>;
  redeemPoints: (dni: string, points: number) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  addPaymentOrder: (po: PaymentOrder) => Promise<void>;
  addShift: (shift: any) => Promise<void>;
  closeOrder: (tableId: string, paymentMethod: string) => Promise<void>;
  updateTableOrder: (tableId: string, items: OrderItem[]) => Promise<void>;
  setProducts: (products: Product[]) => Promise<void>;
  moveTable: (id: string, x: number, y: number) => Promise<void>;
  addTable: (config: Partial<Table>) => Promise<void>;
  removeTable: (id: string) => Promise<void>;
  updateTable: (id: string, updates: Partial<Table>) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const expenses = useLiveQuery(() => db.expenses.toArray()) || [];
  const paymentOrders = useLiveQuery(() => db.paymentOrders.toArray()) || [];
  const orders = useLiveQuery(() => db.orders.orderBy('id').reverse().toArray()) || [];
  // Using db.salonTables — NOT db.tables (reserved by Dexie)
  const tablesFromDB = useLiveQuery(() => db.salonTables.toArray()) || [];
  const comandas = useLiveQuery(() => db.comandas.orderBy('id').reverse().toArray()) || [];
  const rewards = useLiveQuery(() => db.rewards.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const shifts = useLiveQuery(() => db.shifts.toArray()) || [];
  const users = useLiveQuery(() => db.users.toArray()) || [];
  const messages = useLiveQuery(() => db.messages.orderBy('timestamp').toArray()) || [];
  const floorPlans = useLiveQuery(() => db.floorPlans.orderBy('timestamp').reverse().toArray()) || [];

  const defaultTables: Table[] = [
    { id: 'T-01', status: 'available', order: [], lastUpdate: new Date().toISOString(), x: 100, y: 100, type: 'round', width: 80, height: 80, capacity: 4 },
    { id: 'T-02', status: 'available', order: [], lastUpdate: new Date().toISOString(), x: 300, y: 100, type: 'round', width: 80, height: 80, capacity: 4 },
    { id: 'T-03', status: 'available', order: [], lastUpdate: new Date().toISOString(), x: 500, y: 100, type: 'round', width: 80, height: 80, capacity: 6 },
    { id: 'T-04', status: 'available', order: [], lastUpdate: new Date().toISOString(), x: 100, y: 280, type: 'round', width: 80, height: 80, capacity: 4 },
  ];

  const tables = tablesFromDB.length > 0 ? tablesFromDB : defaultTables;

  useEffect(() => {
    const initTables = async () => {
      const planCount = await db.floorPlans.count();
      const tableCount = await db.salonTables.count();
      
      if (tableCount === 0) {
        const defaultPlan = await db.floorPlans.where('isDefault').equals(1).first();
        if (defaultPlan) {
          await db.salonTables.bulkAdd(defaultPlan.tables);
        } else {
          await db.salonTables.bulkAdd(defaultTables);
        }
      }

      const rewardCount = await db.rewards.count();
      if (rewardCount === 0) {
        await db.rewards.bulkAdd([
          { name: 'Café de Regalo', pointsCost: 100, isActive: true },
          { name: 'Postre Gratis', pointsCost: 300, isActive: true },
          { name: '10% de Descuento', pointsCost: 500, isActive: true },
          { name: 'Cena p/ 2 Personas', pointsCost: 2000, isActive: true }
        ]);
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
    console.log('✅ Mesa añadida:', newTable.id, newTable.type);
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
    await db.products.clear();
    await db.products.bulkAdd(newProducts);
  };

  const updateTableOrder = async (tableId: string, items: OrderItem[]) => {
    await db.salonTables.update(tableId, {
      order: items,
      status: items.length > 0 ? 'occupied' : 'available',
      lastUpdate: new Date().toISOString()
    });
  };

  const closeOrder = async (tableId: string, paymentMethod: string, customerId?: string) => {
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

    // Update customer points if DNI provided
    if (customerId) {
      const customer = await db.customers.where('dni').equals(customerId).first();
      if (customer) {
        // 1 point for every $100 spent (adjust ratio as needed)
        const earnedPoints = Math.floor(total / 100);
        await db.customers.update(customer.id!, { points: (customer.points || 0) + earnedPoints });
      }
    }

    await updateTableOrder(tableId, []);
  };

  const addComanda = async (tableId: string, items: any[]) => {
    await db.comandas.add({
      tableId,
      items,
      status: 'pending',
      timestamp: new Date().toISOString()
    });
  };

  const updateComandaStatus = async (id: number, status: any) => {
    const comanda = await db.comandas.get(id);
    if (comanda && status === 'ready' && comanda.status !== 'ready') {
      const elapsedMinutes = (Date.now() - new Date(comanda.timestamp).getTime()) / 60000;
      
      // Update each product's stats
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
  };

  const addCustomer = async (customer: any) => {
    await db.customers.add({ ...customer, points: 0 });
  };

  const updateCustomerPoints = async (dni: string, points: number) => {
    const customer = await db.customers.where('dni').equals(dni).first();
    if (customer) {
      await db.customers.update(customer.id!, { points });
    }
  };

  const redeemPoints = async (dni: string, points: number) => {
    const customer = await db.customers.where('dni').equals(dni).first();
    if (customer) {
      const currentPoints = customer.points || 0;
      if (currentPoints >= points) {
        await db.customers.update(customer.id!, { points: currentPoints - points });
        console.log(`✅ Canje exitoso para ${dni}: -${points} pts`);
      } else {
        throw new Error('Puntos insuficientes');
      }
    }
  };

  const addShift = async (shift: any) => {
    await db.shifts.add(shift);
    // You can also add audit logs here if needed
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
    await db.messages.add({
      ...msg,
      timestamp: new Date().toISOString(),
      status: 'sent'
    });
  };

  const markAsRead = async (id: number) => {
    await db.messages.update(id, { status: 'read' });
  };
  
  const saveFloorPlan = async (name: string) => {
    const currentTables = await db.salonTables.toArray();
    // Limpiar estados de ocupación antes de guardar como plantilla
    const templateTables = currentTables.map(t => ({
      ...t,
      status: 'available',
      order: []
    }));
    
    await db.floorPlans.add({
      name,
      tables: templateTables,
      timestamp: new Date().toISOString()
    });
  };

  const loadFloorPlan = async (id: number) => {
    const plan = await db.floorPlans.get(id);
    if (!plan) return;
    
    // Check if any table is currently occupied before overwriting
    const currentTables = await db.salonTables.toArray();
    const isOccupied = currentTables.some(t => t.status !== 'available');
    
    if (isOccupied) {
      if (!confirm('Atención: Hay mesas ocupadas. Si cargas un nuevo diseño, los pedidos actuales podrían perder su ubicación. ¿Deseas continuar?')) {
        return;
      }
    }
    
    await db.salonTables.clear();
    await db.salonTables.bulkAdd(plan.tables);
  };

  const deleteFloorPlan = async (id: number) => {
    await db.floorPlans.delete(id);
  };

  const setDefaultFloorPlan = async (id: number) => {
    const allPlans = await db.floorPlans.toArray();
    for (const plan of allPlans) {
      await db.floorPlans.update(plan.id!, { isDefault: plan.id === id });
    }
  };

  return (
    <StoreContext.Provider value={{
      products, tables, expenses, paymentOrders, orders, comandas, rewards, customers, shifts, users, messages, floorPlans,
      saveFloorPlan, loadFloorPlan, deleteFloorPlan, setDefaultFloorPlan,
      addExpense, addPaymentOrder, closeOrder, updateTableOrder, setProducts,
      moveTable, addTable, removeTable, updateTable, addShift,
      addComanda, updateComandaStatus, addCustomer, updateCustomerPoints, redeemPoints,
      addUser, updateUser, deleteUser, sendMessage, markAsRead
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
