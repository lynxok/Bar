import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db/database';
import { printComanda, ticketLines, twoCols } from '../../src/lib/printing';

const jobs: any[] = [];
beforeEach(async () => {
  jobs.length = 0;
  await Promise.all(db.tables.map(t => t.clear()));
  (window as any).lynxIpc.invoke = async (channel: string, arg: any) => {
    if (channel === 'printer-config-get') return {
      printers: [{ id: 'k', name: 'Cocina', type: 'network', width: 80 }, { id: 'b', name: 'Barra', type: 'network', width: 58 }],
      ticketPrinterId: 'b', kitchenPrinterId: 'k', stations: { Bebidas: 'b', Postres: 'none' },
      autoPrintComandas: true, autoPrintTicket: false, header: '', footer: '',
    };
    if (channel === 'print-lines') { jobs.push(arg); return { printed: true }; }
    return null;
  };
});

describe('impresión', () => {
  it('alinea dos columnas al ancho del papel', () => {
    expect(twoCols('2 x Milanesa', '$3.000,00', 32)).toHaveLength(32);
    expect(twoCols('Un nombre de producto larguísimo que no entra', '$1,00', 32)).toHaveLength(32);
  });

  it('separa la comanda por estación según la categoría y omite las que no se imprimen', async () => {
    const mila = await db.products.add({ name: 'Milanesa', category: 'Comida', price: 1, stock: 1, sku: '', unit: 'u', takeawayPrice: 0, status: 'active' });
    const birra = await db.products.add({ name: 'Birra', category: 'Bebidas', price: 1, stock: 1, sku: '', unit: 'u', takeawayPrice: 0, status: 'active' });
    const flan = await db.products.add({ name: 'Flan', category: 'Postres', price: 1, stock: 1, sku: '', unit: 'u', takeawayPrice: 0, status: 'active' });
    jobs.length = 0;
    await printComanda({ tableId: 'T-4', items: [
      { productId: mila, name: 'Milanesa', qty: 2, note: 'sin sal' },
      { productId: birra, name: 'Birra', qty: 1 },
      { productId: flan, name: 'Flan', qty: 1 },
    ] }, { onlyIfAuto: true });
    const comandaJobs = jobs.filter(j => j.target === 'k' || j.target === 'b');
    expect(comandaJobs.map(j => j.target).sort()).toEqual(['b', 'k']);
    const cocina = comandaJobs.find(j => j.target === 'k').lines.map((l: any) => l.text).join('\n');
    expect(cocina).toContain('MESA 4');
    expect(cocina).toContain('2 x Milanesa');
    expect(cocina).toContain('sin sal');
    expect(cocina).not.toContain('Birra');
    expect(JSON.stringify(jobs)).not.toContain('Flan');
  });

  it('el ticket muestra totales, propina y la leyenda de no fiscal', () => {
    const lines = ticketLines({ title: 'Mesa 2', items: [{ name: 'Pizza', qty: 2, price: 1000 }], subtotal: 2000, discountPct: 10, discountAmount: 200, total: 1800, tip: 180, paymentMethod: 'Efectivo' }, 32, 'Av. Siempre Viva 123', 'Gracias');
    const text = lines.map((l: any) => l.text || '').join('\n');
    expect(text).toContain('Av. Siempre Viva 123');
    expect(text).toMatch(/TOTAL\s+\$1\.800,00/);
    expect(text).toMatch(/Propina\s+\$180,00/);
    expect(text).toContain('NO VÁLIDO COMO FACTURA');
    expect(lines[lines.length - 1]).toEqual({ type: 'cut' });
  });
});
