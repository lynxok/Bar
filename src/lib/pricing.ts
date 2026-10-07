// Regla única para calcular totales con impuestos en todo el sistema (mesa, POS, mozo).
// Por defecto los precios de la carta YA incluyen IVA (precio final al consumidor):
// el total es la suma de los ítems y el impuesto solo se informa como "incluido".

export const TAX_RATE_KEY = 'bar_taxRate';
export const PRICES_INCLUDE_TAX_KEY = 'bar_pricesIncludeTax';

export interface TaxSettings {
  taxRate: number;
  pricesIncludeTax: boolean;
}

export function readTaxSettings(): TaxSettings {
  let rate = 21, included = true;
  try {
    const r = localStorage.getItem(TAX_RATE_KEY);
    if (r !== null && r !== '' && !Number.isNaN(Number(r))) rate = Number(r);
    const inc = localStorage.getItem(PRICES_INCLUDE_TAX_KEY);
    if (inc !== null) included = inc !== 'false';
  } catch { /* sin storage */ }
  return { taxRate: Math.max(0, rate), pricesIncludeTax: included };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeTotals(subtotal: number, settings: TaxSettings = readTaxSettings()) {
  const r = settings.taxRate / 100;
  if (settings.pricesIncludeTax) {
    return { subtotal, tax: round2(subtotal - subtotal / (1 + r)), total: subtotal, taxIncluded: true };
  }
  const tax = round2(subtotal * r);
  return { subtotal, tax, total: round2(subtotal + tax), taxIncluded: false };
}

export const taxLabel = (settings: { taxRate: number; pricesIncludeTax: boolean }) =>
  settings.pricesIncludeTax ? `IVA incluido (${settings.taxRate}%)` : `Impuesto (${settings.taxRate}%)`;
