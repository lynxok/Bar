import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db/database';
import { closeOrder, closePOSOrder } from '../../src/services/sales';

const product = (over: any = {}) => ({
  name: 'Cerveza', sku: 'C1', category: 'Bebidas', stock: 10, unit: 'u', price: 1000,
  takeawayPrice: 0, status: 'active', ...over,
});

async function openShift() {
  await db.shifts.add({ cashierName: 'Ana', startTime: new Date().toISOString(), expectedCash: 0, declaredCash: 0, difference: 0, cardTotal: 0, transferTotal: 0, comments: '', initialCash: 0, status: 'active' });
}

async function tableWith(order: any[]) {
  await db.salonTables.put({ id: 'T-1', status: 'consuming', order, lastUpdate: '', x: 0, y: 0, type: 'square', width: 80, height: 80, capacity: 4 });
}

beforeEach(async () => {
  await Promise.all(db.tables.map(t => t.clear()));
  localStorage.setItem('bar_user', JSON.stringify({ id: 9, name: 'Ana', role: 'Cajero', permissions: [] }));
});

describe('closeOrder (mesa)', () => {
  it('rechaza el cobro si no hay turno de caja abierto', async () => {
    const id = await db.products.add(product());
    await tableWith([{ id: String(id), productId: id, name: 'Cerveza', price: 1000, qty: 1 }]);
    await expect(closeOrder('T-1', 'Efectivo')).rejects.toThrow(/turno de caja/);
    expect(await db.orders.count()).toBe(0);
    expect((await db.salonTables.get('T-1'))!.order).toHaveLength(1);
  });

  it('aplica descuento, registra la orden, el borrador de factura y libera la mesa', async () => {
    await openShift();
    const id = await db.products.add(product());
    await tableWith([{ id: String(id), productId: id, name: 'Cerveza', price: 1000, qty: 3 }]);
    await closeOrder('T-1', 'Tarjeta', { discountPct: 10 });

    const [order] = await db.orders.toArray();
    expect(order).toMatchObject({ subtotal: 3000, discountPct: 10, discountAmount: 300, total: 2700, paymentMethod: 'Tarjeta', closedBy: 'Ana' });
    const [draft] = await db.billingDrafts.toArray();
    expect(draft.amount).toBe(2700);
    const table = await db.salonTables.get('T-1');
    expect(table!.status).toBe('available');
    expect(table!.order).toEqual([]);
    const audits = await db.auditLogs.toArray();
    expect(audits.some(a => a.action === 'DISCOUNT' && a.userName === 'Ana')).toBe(true);
  });

  it('limita el descuento entre 0 y 100%', async () => {
    await openShift();
    const id = await db.products.add(product());
    await tableWith([{ id: String(id), productId: id, name: 'Cerveza', price: 1000, qty: 1 }]);
    await closeOrder('T-1', 'Efectivo', { discountPct: 250 });
    expect((await db.orders.toArray())[0].total).toBe(0);
  });

  it('descuenta stock por id aunque el producto se haya renombrado', async () => {
    await openShift();
    const id = await db.products.add(product({ name: 'Cerveza IPA' }));
    await tableWith([{ id: String(id), productId: id, name: 'Cerveza (nombre viejo)', price: 1000, qty: 4 }]);
    await closeOrder('T-1', 'Efectivo');
    expect((await db.products.get(id))!.stock).toBe(6);
  });

  it('descuenta insumos de la receta en lugar del plato', async () => {
    await openShift();
    const pan = await db.products.add(product({ name: 'Pan', stock: 20 }));
    const carne = await db.products.add(product({ name: 'Carne', stock: 5 }));
    const burger = await db.products.add(product({ name: 'Burger', stock: 99, recipe: [
      { ingredientId: pan, name: 'Pan', quantity: 2, unit: 'u' },
      { ingredientId: carne, name: 'Carne', quantity: 1, unit: 'u' },
    ] }));
    await tableWith([{ id: String(burger), productId: burger, name: 'Burger', price: 5000, qty: 2 }]);
    await closeOrder('T-1', 'Efectivo');
    expect((await db.products.get(pan))!.stock).toBe(16);
    expect((await db.products.get(carne))!.stock).toBe(3);
    expect((await db.products.get(burger))!.stock).toBe(99);
  });

  it('suma puntos con multiplicador de promoción, salvo awardPoints: false', async () => {
    await openShift();
    await db.loyaltyConfig.put({ id: 'global', pointValue: 1, tierConfig: [], promotions: [{ id: 'p', name: 'x2', multiplier: 2, targets: [], active: true }] });
    await db.customers.add({ dni: '123', name: 'Lucía', points: 0 });
    const id = await db.products.add(product());
    await tableWith([{ id: String(id), productId: id, name: 'Cerveza', price: 1000, qty: 5 }]);
    await closeOrder('T-1', 'Efectivo', { customerDni: '123' });
    expect((await db.customers.where('dni').equals('123').first())!.points).toBe(100); // 5000/100 * 2

    await tableWith([{ id: String(id), productId: id, name: 'Cerveza', price: 1000, qty: 5 }]);
    await closeOrder('T-1', 'Efectivo', { customerDni: '123', awardPoints: false });
    expect((await db.customers.where('dni').equals('123').first())!.points).toBe(100);
  });

  it('acepta el DNI como string (llamadas viejas)', async () => {
    await openShift();
    await db.customers.add({ dni: '555', name: 'Pedro', points: 0 });
    const id = await db.products.add(product());
    await tableWith([{ id: String(id), productId: id, name: 'Cerveza', price: 1000, qty: 1 }]);
    await closeOrder('T-1', 'Efectivo', '555');
    expect((await db.orders.toArray())[0].customerId).toBe('555');
    expect((await db.billingDrafts.toArray())[0].clientName).toBe('Pedro');
  });
});

describe('closeOrder con impuestos', () => {
  it('si los precios no incluyen IVA, registra el total con impuesto (igual que la pantalla)', async () => {
    localStorage.setItem('bar_taxRate', '21');
    localStorage.setItem('bar_pricesIncludeTax', 'false');
    await openShift();
    const id = await db.products.add(product());
    await tableWith([{ id: String(id), productId: id, name: 'Cerveza', price: 1000, qty: 1 }]);
    await closeOrder('T-1', 'Efectivo');
    expect((await db.orders.toArray())[0].total).toBe(1210);
    localStorage.removeItem('bar_pricesIncludeTax');
  });
});

describe('closePOSOrder (caja rápida)', () => {
  it('registra la venta POS con descuento y descuenta stock', async () => {
    await openShift();
    const id = await db.products.add(product());
    await closePOSOrder([{ id: String(id), productId: id, name: 'Cerveza', price: 1000, qty: 2 }], 2420, 'QR', { discountPct: 50 });
    const [order] = await db.orders.toArray();
    expect(order).toMatchObject({ tableId: 'POS_FAST', subtotal: 2000, total: 1210, discountAmount: 1210 });
    expect((await db.products.get(id))!.stock).toBe(8);
  });

  it('no hace nada con un carrito vacío', async () => {
    await closePOSOrder([], 0, 'Efectivo');
    expect(await db.orders.count()).toBe(0);
  });
});

describe('sincronización en el host', () => {
  it('marca updatedAt y registra los borrados', async () => {
    const id = await db.products.add(product());
    const created = await db.products.get(id);
    expect(created!.updatedAt).toBeTruthy();
    await db.products.delete(id);
    await new Promise(r => setTimeout(r, 20));
    const tombs = await db.tombstones.toArray();
    expect(tombs).toEqual([expect.objectContaining({ table: 'products', key: id })]);
  });
});
