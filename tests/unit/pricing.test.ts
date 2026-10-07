import { afterEach, describe, expect, it } from 'vitest';
import { computeTotals, readTaxSettings } from '../../src/lib/pricing';
import { classifyPaymentMethod, sumByPaymentBucket } from '../../src/lib/payments';

afterEach(() => localStorage.clear());

describe('impuestos', () => {
  it('por defecto los precios incluyen IVA: el total es el precio de carta', () => {
    expect(readTaxSettings()).toEqual({ taxRate: 21, pricesIncludeTax: true });
    const t = computeTotals(1210);
    expect(t.total).toBe(1210);
    expect(t.tax).toBe(210);
  });
  it('si se desactiva, el impuesto se suma', () => {
    expect(computeTotals(1000, { taxRate: 21, pricesIncludeTax: false })).toMatchObject({ tax: 210, total: 1210 });
  });
  it('se puede guardar 0% (antes se convertía en 21%)', () => {
    localStorage.setItem('bar_taxRate', '0');
    expect(readTaxSettings().taxRate).toBe(0);
  });
});

describe('medios de pago en el cierre de caja', () => {
  it('clasifica los nombres de todas las pantallas', () => {
    expect(['Efectivo', 'cash', '', undefined].map(classifyPaymentMethod)).toEqual(['cash', 'cash', 'cash', 'cash']);
    expect(['Tarjeta', 'card', 'Tarjeta de débito'].map(classifyPaymentMethod)).toEqual(['card', 'card', 'card']);
    expect(['QR', 'qr', 'Billetera', 'Transferencia', 'Mercado Pago'].map(classifyPaymentMethod)).toEqual(Array(5).fill('transfer'));
  });
  it('QR y billetera ya no inflan el efectivo esperado', () => {
    const t = sumByPaymentBucket([{ paymentMethod: 'Efectivo', total: 100 }, { paymentMethod: 'qr', total: 50 }, { paymentMethod: 'Billetera', total: 25 }, { paymentMethod: 'card', total: 10 }]);
    expect(t).toEqual({ cash: 100, card: 10, transfer: 75 });
  });
});
