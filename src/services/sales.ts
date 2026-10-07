// Lógica de cierre de ventas (mesa y POS rápido), independiente de React para poder testearla.
import { db, type Product } from '../db/database';
import { getStoredUser } from '../lib/auth';
import { LoggerService } from '../lib/LoggerService';
import { computeTotals } from '../lib/pricing';

export interface OrderItem {
  id: string;
  /** id numérico del producto en inventario (para descontar stock aunque se renombre) */
  productId?: number;
  name: string;
  price: number;
  qty: number;
}

export interface CloseOrderOptions {
  /** DNI del cliente para el programa de fidelidad */
  customerDni?: string;
  /** Descuento en porcentaje (0-100) aplicado al total */
  discountPct?: number;
  /** false si los puntos ya se repartieron por otra vía (p. ej. cuenta dividida) */
  awardPoints?: boolean;
}

// ---------- Cierre de ventas (mesa y POS rápido) ----------
// Busca el producto de un ítem por id (estable) y, solo para pedidos viejos, por nombre.
export const findProductForItem = async (item: any): Promise<Product | undefined> => {
  const rawId = item?.productId ?? item?.id;
  const pid = typeof rawId === 'number' ? rawId : (/^\d+$/.test(String(rawId ?? '')) ? Number(rawId) : undefined);
  if (pid != null) {
    const byId = await db.products.get(pid);
    if (byId) return byId;
  }
  return item?.name ? db.products.where('name').equals(item.name).first() : undefined;
};

const deductStockForItem = async (item: any) => {
  const qty = item.qty || 1;
  const product = await findProductForItem(item);
  if (!product || product.id == null) return;
  if (product.recipe && product.recipe.length > 0) {
    for (const ing of product.recipe) {
      const ingProduct = ing.ingredientId
        ? await db.products.get(ing.ingredientId)
        : await db.products.where('name').equals(ing.name).first();
      if (ingProduct && ingProduct.id != null) {
        await db.products.update(ingProduct.id, { stock: Math.max(0, (ingProduct.stock || 0) - (ing.quantity * qty)) });
      }
    }
  } else {
    await db.products.update(product.id, { stock: Math.max(0, (product.stock || 0) - qty) });
  }
};

const normalizeCloseOptions = (options?: string | CloseOrderOptions): Required<Omit<CloseOrderOptions, 'customerDni'>> & { customerDni?: string } => {
  const o: CloseOrderOptions = typeof options === 'string' ? { customerDni: options } : (options || {});
  const pct = Number(o.discountPct) || 0;
  return {
    customerDni: o.customerDni ? String(o.customerDni).trim() || undefined : undefined,
    discountPct: Math.min(100, Math.max(0, pct)),
    awardPoints: o.awardPoints !== false,
  };
};

const requireActiveShift = async () => {
  const shift = await db.shifts.where('status').equals('active').first();
  if (!shift) {
    throw new Error('No hay un turno de caja abierto. Abrí el turno en "Cierre de Caja" antes de cobrar.');
  }
  return shift;
};

const roundMoney = (n: number) => Math.round(n * 100) / 100;

/** Registra la venta: orden inmutable, borrador de factura, puntos y stock. Devuelve el total cobrado. */
const registerSale = async (params: {
  tableId: string; items: any[]; grossTotal: number; paymentMethod: string;
  opts: ReturnType<typeof normalizeCloseOptions>; defaultClientName: string; loyaltyLabel: string;
}) => {
  const { tableId, items, grossTotal, paymentMethod, opts, defaultClientName, loyaltyLabel } = params;
  const subtotal = items.reduce((acc: number, i: any) => acc + (i.price * (i.qty || 1)), 0);
  const discountAmount = roundMoney(grossTotal * opts.discountPct / 100);
  const total = roundMoney(grossTotal - discountAmount);
  const user = getStoredUser();
  const now = new Date().toISOString();

  await db.orders.add({
    tableId,
    items,
    subtotal,
    discountPct: opts.discountPct,
    discountAmount,
    total,
    paymentMethod,
    customerId: opts.customerDni,
    closedBy: user?.name,
    status: 'closed',
    timestamp: now
  });

  const customer = opts.customerDni
    ? await db.customers.where('dni').equals(opts.customerDni).first()
    : undefined;

  await db.billingDrafts.add({
    id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
    date: now,
    clientName: customer?.name || defaultClientName,
    concept: items.map((i: any) => `${i.qty}x ${i.name}`).join(', '),
    paymentMethod,
    amount: total,
    billed: false
  });

  if (customer && opts.awardPoints) {
    const config = await db.loyaltyConfig.get('global');
    const basePoints = Math.floor(total / 100);
    let multiplier = 1;
    const nowStr = now.split('T')[0];
    (config?.promotions || []).forEach(p => {
      if (p.active) {
        const startOk = !p.startDate || nowStr >= p.startDate;
        const endOk = !p.endDate || nowStr <= p.endDate;
        if (startOk && endOk) multiplier = Math.max(multiplier, p.multiplier);
      }
    });
    const earnedPoints = Math.floor(basePoints * multiplier);
    await db.customers.update(customer.id!, { points: (customer.points || 0) + earnedPoints });
    await db.loyaltyTransactions.add({
      customerDni: customer.dni,
      customerName: customer.name,
      type: 'purchase',
      points: earnedPoints,
      description: `${loyaltyLabel} - Pago ${paymentMethod}`,
      timestamp: now,
    });
  }

  for (const item of items) {
    await deductStockForItem(item);
  }
  return { total, discountAmount };
};

const auditDiscount = async (where: string, opts: ReturnType<typeof normalizeCloseOptions>, discountAmount: number, total: number) => {
  if (opts.discountPct <= 0) return;
  const user = getStoredUser();
  try {
    await LoggerService.audit('DISCOUNT', 'VENTAS',
      `${where}: descuento ${opts.discountPct}% (-$${discountAmount.toFixed(2)}), total $${total.toFixed(2)}`,
      String(user?.id ?? 'system'), user?.name ?? 'Sistema');
  } catch (e) { console.error('No se pudo auditar el descuento', e); }
};

export const closeOrder = async (tableId: string, paymentMethod: string, options?: string | CloseOrderOptions) => {
  const opts = normalizeCloseOptions(options);
  await requireActiveShift();
  let result: { total: number; discountAmount: number } | null = null;
  await db.transaction('rw', [db.salonTables, db.orders, db.customers, db.products, db.loyaltyTransactions, db.loyaltyConfig, db.billingDrafts], async () => {
    const table = await db.salonTables.get(tableId);
    if (!table || table.order.length === 0) return;
    // Total con la misma regla de impuestos que muestran las pantallas de cobro
    const grossTotal = computeTotals(table.order.reduce((acc: number, i: any) => acc + (i.price * (i.qty || 1)), 0)).total;
    result = await registerSale({
      tableId, items: table.order, grossTotal, paymentMethod, opts,
      defaultClientName: 'Mesa ' + tableId.replace('T-', ''),
      loyaltyLabel: `Compra Mesa ${tableId.replace('T-', '')}`,
    });
    await db.salonTables.update(tableId, {
      order: [],
      status: 'available',
      lastUpdate: new Date().toISOString()
    });
  });
  if (result) await auditDiscount(`Mesa ${tableId.replace('T-', '')}`, opts, (result as any).discountAmount, (result as any).total);
};

export const closePOSOrder = async (items: OrderItem[], total: number, paymentMethod: string, options?: string | CloseOrderOptions) => {
  if (items.length === 0) return;
  const opts = normalizeCloseOptions(options);
  await requireActiveShift();
  let result: { total: number; discountAmount: number } | null = null;
  await db.transaction('rw', [db.orders, db.customers, db.products, db.loyaltyTransactions, db.loyaltyConfig, db.billingDrafts], async () => {
    result = await registerSale({
      tableId: 'POS_FAST', items, grossTotal: total, paymentMethod, opts,
      defaultClientName: 'Consumidor Final',
      loyaltyLabel: 'Venta POS Rápida',
    });
  });
  if (result) await auditDiscount('POS Rápido', opts, (result as any).discountAmount, (result as any).total);
};
