import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db/database';
import { closeOrder, closePOSOrder } from '../../src/services/sales';
import { buildFillItem, crossedMilestones, DEFAULT_MUG_PROGRAM, fillPoints, fillPrice, parseMugCode } from '../../src/lib/mugs';

async function openShift() {
  await db.shifts.add({ cashierName: 'Ana', startTime: new Date().toISOString(), expectedCash: 0, declaredCash: 0, difference: 0, cardTotal: 0, transferTotal: 0, comments: '', initialCash: 0, status: 'active' });
}

async function setup(program: any = {}) {
  await db.loyaltyConfig.put({ id: 'global', pointValue: 0.005, tierConfig: [], promotions: [], mugProgram: { ...DEFAULT_MUG_PROGRAM, ...program } });
  await db.customers.add({ dni: '30111222', name: 'Hans', points: 0 });
  const productId = await db.products.add({ name: 'IPA', sku: 'IPA', category: 'Cervezas', stock: 50, unit: 'u', price: 3000, takeawayPrice: 0, status: 'active' }) as number;
  const mugId = await db.mugs.add({ code: 'ABC234', customerDni: '30111222', customerName: 'Hans', capacityMl: 1000, status: 'active', totalMl: 0, fillCount: 0, createdAt: new Date().toISOString() }) as number;
  const mug = (await db.mugs.get(mugId))!;
  return { productId, mug };
}

beforeEach(async () => {
  await Promise.all(db.tables.map(t => t.clear()));
  localStorage.setItem('bar_user', JSON.stringify({ id: 9, name: 'Ana', role: 'Cajero', permissions: [] }));
});

describe('reglas de vasos', () => {
  it('lee el código desde el QR, una URL o tipeado', () => {
    expect(parseMugCode('LYNX-MUG:abc234')).toBe('ABC234');
    expect(parseMugCode('https://bar.local/vaso/ABC234')).toBe('ABC234');
    expect(parseMugCode(' abc-234 ')).toBe('ABC234');
    expect(parseMugCode('x')).toBeNull();
  });

  it('precio con descuento opcional para dueños y puntos por litro o por peso', () => {
    expect(fillPrice(6000, 1000)).toBe(6000);
    expect(fillPrice(6000, 500, 10)).toBe(2700);
    expect(fillPoints({ ...DEFAULT_MUG_PROGRAM, pointsPerLiter: 10 }, 1500, 9000)).toBe(15);
    expect(fillPoints({ ...DEFAULT_MUG_PROGRAM, pointsMode: 'per_peso' }, 1500, 9000)).toBe(90);
    expect(crossedMilestones(DEFAULT_MUG_PROGRAM, 49_500, 50_500).map(m => m.liters)).toEqual([50]);
  });
});

describe('recarga de vaso al cobrar', () => {
  it('registra la recarga, suma litros y puntos por litro al dueño, sin descontar stock', async () => {
    await openShift();
    const { productId, mug } = await setup({ pointsPerLiter: 10 });
    const fill = buildFillItem({ mug, product: { productId, name: 'IPA', pricePerLiter: 6000 }, volumeMl: 1000, holderDiscountPct: 0 });
    await closePOSOrder([fill as any], 6000, 'Efectivo');

    const [rec] = await db.mugFills.toArray();
    expect(rec).toMatchObject({ mugCode: 'ABC234', ownerDni: '30111222', volumeMl: 1000, points: 10, tableId: 'POS_FAST' });
    expect(await db.mugs.get(mug.id!)).toMatchObject({ totalMl: 1000, fillCount: 1 });
    expect((await db.customers.where('dni').equals('30111222').first())!.points).toBe(10);
    expect((await db.products.get(productId))!.stock).toBe(50);
  });

  it('en una mesa, la recarga va al dueño del vaso y el resto al cliente de la venta; suma bonus de hito', async () => {
    await openShift();
    const { productId, mug } = await setup({ pointsPerLiter: 10, milestones: [{ liters: 1, bonusPoints: 100, label: 'Primer litro' }] });
    await db.customers.add({ dni: '40999888', name: 'Otro', points: 0 });
    const fill = buildFillItem({ mug, product: { productId, name: 'IPA', pricePerLiter: 6000 }, volumeMl: 1000, holderDiscountPct: 0 });
    await db.salonTables.put({ id: 'T-1', status: 'consuming', order: [fill, { id: String(productId), productId, name: 'IPA', price: 3000, qty: 1 }], lastUpdate: '', x: 0, y: 0, type: 'square', width: 80, height: 80, capacity: 4 } as any);
    await closeOrder('T-1', 'Efectivo', { customerDni: '40999888' });

    const hans = await db.customers.where('dni').equals('30111222').first();
    const otro = await db.customers.where('dni').equals('40999888').first();
    expect(hans!.points).toBe(110);
    expect(otro!.points).toBeGreaterThan(0);
    expect(otro!.points).toBeLessThan(90); // no cobra puntos por la recarga
    expect((await db.products.get(productId))!.stock).toBe(49); // solo la pinta suelta
    expect((await db.loyaltyTransactions.where('customerDni').equals('30111222').toArray()).map(t => t.type)).toEqual(['purchase', 'adjustment']);
  });

  it('el abono de locker extiende el vencimiento', async () => {
    await openShift();
    const lockerId = await db.lockers.add({ label: 'A-1', status: 'assigned', customerDni: '30111222', expiresAt: '2000-01-01' }) as number;
    await closePOSOrder([{ id: 'LOCKER-A-1', name: 'Abono locker A-1 (2 meses)', price: 1000, qty: 1, lockerRenewal: { lockerId, months: 2 } } as any], 1000, 'Efectivo');
    const l = await db.lockers.get(lockerId);
    expect(l!.expiresAt! > new Date().toISOString().split('T')[0]).toBe(true);
  });
});
