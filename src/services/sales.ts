// Lógica de cierre de ventas (mesa y POS rápido), independiente de React para poder testearla.
import { db, type Product } from '../db/database';
import { getStoredUser } from '../lib/auth';
import { LoggerService } from '../lib/LoggerService';
import { computeTotals } from '../lib/pricing';
import { activeMultiplier, crossedMilestones, fillPoints, getMugProgram, isFillItem } from '../lib/mugs';

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
  /** Propina: se registra aparte; no suma a ventas, facturación ni puntos */
  tip?: number;
  /** Referencia externa del pago (p. ej. id de pago de Mercado Pago) */
  paymentRef?: string;
}

/** Una parte de una cuenta dividida */
export interface SplitPart {
  paymentMethod: string;
  customerDni?: string;
  tip?: number;
  paymentRef?: string;
  /** Modo por ítems: qué ítems (id de la línea del pedido) y cuántas unidades paga esta parte */
  items?: { id: string; qty: number }[];
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
  // Recargas de vaso y abonos de locker no descuentan stock (el barril no se sigue por ahora)
  if (isFillItem(item) || item?.lockerRenewal) return;
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

type NormalizedOptions = {
  customerDni?: string;
  discountPct: number;
  awardPoints: boolean;
  tip: number;
  paymentRef?: string;
};

const roundMoney = (n: number) => Math.round(n * 100) / 100;

const normalizeCloseOptions = (options?: string | CloseOrderOptions): NormalizedOptions => {
  const o: CloseOrderOptions = typeof options === 'string' ? { customerDni: options } : (options || {});
  const pct = Number(o.discountPct) || 0;
  const tip = Number(o.tip) || 0;
  return {
    customerDni: o.customerDni ? String(o.customerDni).trim() || undefined : undefined,
    discountPct: Math.min(100, Math.max(0, pct)),
    awardPoints: o.awardPoints !== false,
    tip: Math.max(0, roundMoney(tip)),
    paymentRef: o.paymentRef || undefined,
  };
};

const requireActiveShift = async () => {
  const shift = await db.shifts.where('status').equals('active').first();
  if (!shift) {
    throw new Error('No hay un turno de caja abierto. Abrí el turno en "Cierre de Caja" antes de cobrar.');
  }
  return shift;
};

const itemsSubtotal = (items: any[]) => items.reduce((acc: number, i: any) => acc + (i.price * (i.qty || 1)), 0);

/** Registra una venta: orden inmutable, borrador de factura y puntos. No toca stock. */
const registerSale = async (params: {
  tableId: string; items: any[]; grossTotal: number; paymentMethod: string;
  opts: NormalizedOptions; defaultClientName: string; loyaltyLabel: string;
  extra?: Record<string, unknown>;
}) => {
  const { tableId, items, grossTotal, paymentMethod, opts, defaultClientName, loyaltyLabel, extra } = params;
  const subtotal = itemsSubtotal(items);
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
    tip: opts.tip,
    paymentMethod,
    paymentRef: opts.paymentRef,
    customerId: opts.customerDni,
    closedBy: user?.name,
    status: 'closed',
    timestamp: now,
    ...(extra || {}),
  });

  const customer = opts.customerDni
    ? await db.customers.where('dni').equals(opts.customerDni).first()
    : undefined;

  await db.billingDrafts.add({
    id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
    date: now,
    clientName: customer?.name || defaultClientName,
    concept: items.length ? items.map((i: any) => `${i.qty}x ${i.name}`).join(', ') : loyaltyLabel,
    paymentMethod,
    amount: total,
    billed: false
  });

  const config = await db.loyaltyConfig.get('global');
  const multiplier = activeMultiplier(config, now);
  const fillLines = items.filter(isFillItem);
  // Factor para pasar de precio de lista a lo efectivamente cobrado (descuento e impuestos incluidos)
  const paidRatio = subtotal > 0 ? total / subtotal : 0;
  const fillPaid = roundMoney(itemsSubtotal(fillLines) * paidRatio);

  // Puntos generales del cliente de la venta: las recargas suman aparte, al dueño del vaso
  if (customer && opts.awardPoints) {
    const basePoints = Math.floor(Math.max(0, total - fillPaid) / 100);
    const earnedPoints = Math.floor(basePoints * multiplier);
    if (earnedPoints > 0 || fillLines.length === 0) {
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
  }

  if (fillLines.length) {
    await registerMugFills({ lines: fillLines, paidRatio, multiplier, config, opts, tableId, paymentMethod, now, servedBy: user?.name });
  }
  for (const item of items) {
    if (item?.lockerRenewal) await renewLocker(item.lockerRenewal, now);
  }

  return { total, discountAmount };
};

/** Registra recargas de vaso: historial, litros del vaso, puntos al dueño e hitos de litros. */
const registerMugFills = async (p: {
  lines: any[]; paidRatio: number; multiplier: number; config: any; opts: NormalizedOptions;
  tableId: string; paymentMethod: string; now: string; servedBy?: string;
}) => {
  const program = getMugProgram(p.config);
  for (const line of p.lines) {
    const qty = line.qty || 1;
    const mug = await db.mugs.get(line.mugFill.mugId);
    if (!mug || mug.id == null) continue; // vaso dado de baja: la venta se cobra igual
    const volumeMl = (Number(line.mugFill.volumeMl) || mug.capacityMl) * qty;
    const amount = roundMoney(line.price * qty * p.paidRatio);
    const owner = await db.customers.where('dni').equals(mug.customerDni).first();
    const points = owner && p.opts.awardPoints ? fillPoints(program, volumeMl, amount, p.multiplier) : 0;

    const ownerMugs = await db.mugs.where('customerDni').equals(mug.customerDni).toArray();
    const beforeMl = ownerMugs.reduce((acc, m) => acc + (m.totalMl || 0), 0);

    await db.mugFills.add({
      mugId: mug.id, mugCode: mug.code, ownerDni: mug.customerDni,
      productId: line.productId, productName: String(line.name), volumeMl, amount, points,
      tableId: p.tableId, paymentMethod: p.paymentMethod, servedBy: p.servedBy, timestamp: p.now,
    });
    await db.mugs.update(mug.id, {
      totalMl: (mug.totalMl || 0) + volumeMl,
      fillCount: (mug.fillCount || 0) + qty,
      lastFillAt: p.now,
    });

    if (!owner || owner.id == null) continue;
    const bonuses = p.opts.awardPoints ? crossedMilestones(program, beforeMl, beforeMl + volumeMl) : [];
    const totalNew = points + bonuses.reduce((a, b) => a + (Number(b.bonusPoints) || 0), 0);
    if (totalNew > 0) await db.customers.update(owner.id, { points: (owner.points || 0) + totalNew });
    await db.loyaltyTransactions.add({
      customerDni: owner.dni, customerName: owner.name, type: 'purchase', points,
      description: `Recarga vaso ${mug.code}: ${(volumeMl / 1000).toLocaleString('es-AR')} L`,
      timestamp: p.now,
    });
    for (const b of bonuses) {
      await db.loyaltyTransactions.add({
        customerDni: owner.dni, customerName: owner.name, type: 'adjustment', points: Number(b.bonusPoints) || 0,
        description: `Hito ${b.liters} L alcanzado: ${b.label}`, timestamp: p.now,
      });
    }
  }
};

/** Extiende el abono de un locker N meses desde su vencimiento (o desde hoy si ya venció). */
const renewLocker = async (r: { lockerId: number; months: number }, now: string) => {
  const locker = await db.lockers.get(r.lockerId);
  if (!locker || locker.id == null) return;
  const today = now.split('T')[0];
  const from = locker.expiresAt && locker.expiresAt > today ? locker.expiresAt : today;
  const d = new Date(`${from}T12:00:00`);
  d.setMonth(d.getMonth() + Math.max(1, Math.floor(Number(r.months) || 1)));
  await db.lockers.update(locker.id, { expiresAt: d.toISOString().split('T')[0] });
};

const auditDiscount = async (where: string, opts: NormalizedOptions, discountAmount: number, total: number) => {
  if (opts.discountPct <= 0) return;
  const user = getStoredUser();
  try {
    await LoggerService.audit('DISCOUNT', 'VENTAS',
      `${where}: descuento ${opts.discountPct}% (-$${discountAmount.toFixed(2)}), total $${total.toFixed(2)}`,
      String(user?.id ?? 'system'), user?.name ?? 'Sistema');
  } catch (e) { console.error('No se pudo auditar el descuento', e); }
};

const SALE_TABLES = () => [db.salonTables, db.orders, db.customers, db.products, db.loyaltyTransactions, db.loyaltyConfig, db.billingDrafts, db.mugs, db.mugFills, db.lockers];
const tableLabel = (tableId: string) => tableId.replace('T-', '');

export const closeOrder = async (tableId: string, paymentMethod: string, options?: string | CloseOrderOptions) => {
  const opts = normalizeCloseOptions(options);
  await requireActiveShift();
  let result: { total: number; discountAmount: number } | null = null;
  await db.transaction('rw', SALE_TABLES(), async () => {
    const table = await db.salonTables.get(tableId);
    if (!table || table.order.length === 0) return;
    // Total con la misma regla de impuestos que muestran las pantallas de cobro
    const grossTotal = computeTotals(itemsSubtotal(table.order)).total;
    result = await registerSale({
      tableId, items: table.order, grossTotal, paymentMethod, opts,
      defaultClientName: 'Mesa ' + tableLabel(tableId),
      loyaltyLabel: `Compra Mesa ${tableLabel(tableId)}`,
    });
    for (const item of table.order) await deductStockForItem(item);
    await db.salonTables.update(tableId, { order: [], status: 'available', lastUpdate: new Date().toISOString() });
  });
  if (result) await auditDiscount(`Mesa ${tableLabel(tableId)}`, opts, (result as any).discountAmount, (result as any).total);
};

/**
 * Cobra una mesa en varias partes. Dos modos:
 * - Partes iguales: ninguna parte trae `items`; el total se reparte en partes iguales.
 * - Por ítems: cada parte indica qué unidades paga; entre todas deben cubrir el pedido completo.
 * Cada parte genera su propia orden (con su medio de pago, DNI y propina) y su borrador de factura.
 * El stock se descuenta una sola vez por el pedido completo.
 */
export const closeOrderSplit = async (tableId: string, parts: SplitPart[], options?: { discountPct?: number }) => {
  if (!Array.isArray(parts) || parts.length < 2) throw new Error('Para dividir la cuenta hacen falta al menos 2 partes.');
  if (parts.some(p => !p.paymentMethod)) throw new Error('Cada parte necesita un medio de pago.');
  await requireActiveShift();
  const discountPct = Math.min(100, Math.max(0, Number(options?.discountPct) || 0));
  const byItems = parts.every(p => Array.isArray(p.items) && p.items.length > 0);
  if (!byItems && parts.some(p => p.items && p.items.length)) {
    throw new Error('O todas las partes eligen ítems, o se divide en partes iguales.');
  }
  const group = `S-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const totals: number[] = [];

  await db.transaction('rw', SALE_TABLES(), async () => {
    const table = await db.salonTables.get(tableId);
    if (!table || table.order.length === 0) throw new Error('La mesa no tiene consumos para cobrar.');
    const order: any[] = table.order;

    // Ítems y subtotal de cada parte
    let partItems: any[][];
    let partSubtotals: number[];
    if (byItems) {
      const assigned = new Map<string, number>();
      partItems = parts.map(p => p.items!.map(sel => {
        const line = order.find(i => String(i.id) === String(sel.id));
        if (!line) throw new Error(`El ítem ${sel.id} no está en la mesa.`);
        const qty = Math.floor(Number(sel.qty));
        if (!(qty > 0)) throw new Error(`Cantidad inválida para ${line.name}.`);
        assigned.set(String(line.id), (assigned.get(String(line.id)) || 0) + qty);
        return { ...line, qty };
      }));
      for (const line of order) {
        const got = assigned.get(String(line.id)) || 0;
        if (got !== (line.qty || 1)) {
          throw new Error(`"${line.name}": se asignaron ${got} de ${line.qty || 1} unidades. Revisá la división.`);
        }
      }
      partSubtotals = partItems.map(itemsSubtotal);
    } else {
      const sub = itemsSubtotal(order);
      const base = Math.floor((sub / parts.length) * 100) / 100;
      partSubtotals = parts.map((_, i) => i === parts.length - 1 ? roundMoney(sub - base * (parts.length - 1)) : base);
      // Los ítems quedan en la primera parte para que las estadísticas de productos no se dupliquen
      partItems = parts.map((_, i) => i === 0 ? order : []);
    }

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const opts = normalizeCloseOptions({ customerDni: part.customerDni, discountPct, tip: part.tip, paymentRef: part.paymentRef });
      const grossTotal = computeTotals(partSubtotals[i]).total;
      const r = await registerSale({
        tableId, items: partItems[i], grossTotal, paymentMethod: part.paymentMethod, opts,
        defaultClientName: `Mesa ${tableLabel(tableId)} (parte ${i + 1}/${parts.length})`,
        loyaltyLabel: `Mesa ${tableLabel(tableId)} - parte ${i + 1}/${parts.length}`,
        extra: { splitGroup: group, splitIndex: i + 1, splitCount: parts.length, splitMode: byItems ? 'items' : 'equal' },
      });
      totals.push(r.total);
    }

    for (const item of order) await deductStockForItem(item);
    await db.salonTables.update(tableId, { order: [], status: 'available', lastUpdate: new Date().toISOString() });
  });

  if (discountPct > 0) {
    const sum = totals.reduce((a, b) => a + b, 0);
    await auditDiscount(`Mesa ${tableLabel(tableId)} (dividida en ${parts.length})`, normalizeCloseOptions({ discountPct }), 0, sum);
  }
  return { group, totals };
};

export const closePOSOrder = async (items: OrderItem[], total: number, paymentMethod: string, options?: string | CloseOrderOptions) => {
  if (items.length === 0) return;
  const opts = normalizeCloseOptions(options);
  await requireActiveShift();
  let result: { total: number; discountAmount: number } | null = null;
  await db.transaction('rw', SALE_TABLES(), async () => {
    result = await registerSale({
      tableId: 'POS_FAST', items, grossTotal: total, paymentMethod, opts,
      defaultClientName: 'Consumidor Final',
      loyaltyLabel: 'Venta POS Rápida',
    });
    for (const item of items) await deductStockForItem(item);
  });
  if (result) await auditDiscount('POS Rápido', opts, (result as any).discountAmount, (result as any).total);
};
