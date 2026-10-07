import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db/database';
import { closeOrder, closeOrderSplit } from '../../src/services/sales';
import { summarizeShift } from '../../src/lib/payments';

const P = (over: any = {}) => ({ name: 'Pizza', sku: 'p', category: 'Comida', stock: 10, unit: 'u', price: 1000, takeawayPrice: 0, status: 'active', ...over });

async function setup(order: any[]) {
  await db.shifts.add({ cashierName: 'Ana', startTime: new Date().toISOString(), expectedCash: 0, declaredCash: 0, difference: 0, cardTotal: 0, transferTotal: 0, comments: '', initialCash: 0, status: 'active' });
  await db.salonTables.put({ id: 'T-5', status: 'consuming', order, lastUpdate: '', x: 0, y: 0, type: 'square', width: 80, height: 80, capacity: 4 });
}

beforeEach(async () => {
  await Promise.all(db.tables.map(t => t.clear()));
  localStorage.clear();
});

describe('propina', () => {
  it('se guarda aparte y no suma a la venta ni a la factura', async () => {
    const id = await db.products.add(P());
    await setup([{ id: 'a', productId: id, name: 'Pizza', price: 1000, qty: 2 }]);
    await closeOrder('T-5', 'Efectivo', { tip: 300 });
    const [o] = await db.orders.toArray();
    expect(o.total).toBe(2000);
    expect(o.tip).toBe(300);
    expect((await db.billingDrafts.toArray())[0].amount).toBe(2000);
  });

  it('el cierre suma las propinas en efectivo a la caja esperada y las informa aparte', () => {
    const r = summarizeShift([
      { paymentMethod: 'Efectivo', total: 2000, tip: 300 },
      { paymentMethod: 'Tarjeta', total: 1000, tip: 100 },
    ], 500);
    expect(r.sales).toEqual({ cash: 2000, card: 1000, transfer: 0 });
    expect(r.tips).toEqual({ cash: 300, card: 100, transfer: 0, total: 400 });
    expect(r.expectedCash).toBe(2800);
  });
});

describe('cuenta dividida', () => {
  it('partes iguales: una orden por parte, montos que suman el total y stock una sola vez', async () => {
    const id = await db.products.add(P());
    await setup([{ id: 'a', productId: id, name: 'Pizza', price: 1000, qty: 1 }]);
    const r = await closeOrderSplit('T-5', [
      { paymentMethod: 'Efectivo' }, { paymentMethod: 'Tarjeta' }, { paymentMethod: 'QR', tip: 50 },
    ]);
    expect(r.totals).toEqual([333.33, 333.33, 333.34]);
    const orders = await db.orders.toArray();
    expect(orders).toHaveLength(3);
    expect(orders.map(o => o.paymentMethod)).toEqual(['Efectivo', 'Tarjeta', 'QR']);
    expect(orders.every(o => o.splitGroup === r.group && o.splitCount === 3)).toBe(true);
    expect(orders[0].items).toHaveLength(1);
    expect(orders[1].items).toHaveLength(0);
    expect(orders[2].tip).toBe(50);
    expect((await db.products.get(id))!.stock).toBe(9);
    expect(await db.billingDrafts.count()).toBe(3);
    expect((await db.salonTables.get('T-5'))!.order).toEqual([]);
  });

  it('por ítems: cada parte paga lo suyo, con su DNI y puntos', async () => {
    await db.customers.add({ dni: '111', name: 'Ana', points: 0 });
    const pizza = await db.products.add(P());
    const birra = await db.products.add(P({ name: 'Birra', price: 500 }));
    await setup([
      { id: 'a', productId: pizza, name: 'Pizza', price: 1000, qty: 2 },
      { id: 'b', productId: birra, name: 'Birra', price: 500, qty: 2 },
    ]);
    const r = await closeOrderSplit('T-5', [
      { paymentMethod: 'Efectivo', customerDni: '111', items: [{ id: 'a', qty: 2 }] },
      { paymentMethod: 'Tarjeta', items: [{ id: 'b', qty: 2 }] },
    ]);
    expect(r.totals).toEqual([2000, 1000]);
    expect((await db.customers.where('dni').equals('111').first())!.points).toBe(20);
    expect((await db.products.get(pizza))!.stock).toBe(8);
    expect((await db.products.get(birra))!.stock).toBe(8);
  });

  it('por ítems: rechaza si no se asignan todas las unidades y no toca nada', async () => {
    const id = await db.products.add(P());
    await setup([{ id: 'a', productId: id, name: 'Pizza', price: 1000, qty: 3 }]);
    await expect(closeOrderSplit('T-5', [
      { paymentMethod: 'Efectivo', items: [{ id: 'a', qty: 1 }] },
      { paymentMethod: 'Tarjeta', items: [{ id: 'a', qty: 1 }] },
    ])).rejects.toThrow(/asignaron 2 de 3/);
    expect(await db.orders.count()).toBe(0);
    expect((await db.salonTables.get('T-5'))!.order).toHaveLength(1);
    expect((await db.products.get(id))!.stock).toBe(10);
  });

  it('aplica el descuento a cada parte', async () => {
    const id = await db.products.add(P());
    await setup([{ id: 'a', productId: id, name: 'Pizza', price: 1000, qty: 2 }]);
    const r = await closeOrderSplit('T-5', [{ paymentMethod: 'Efectivo' }, { paymentMethod: 'Efectivo' }], { discountPct: 10 });
    expect(r.totals).toEqual([900, 900]);
  });

  it('pide al menos 2 partes', async () => {
    await setup([{ id: 'a', name: 'Pizza', price: 1000, qty: 1 }]);
    await expect(closeOrderSplit('T-5', [{ paymentMethod: 'Efectivo' }])).rejects.toThrow(/al menos 2/);
  });
});
