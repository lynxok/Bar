// Alertas de stock bajo y lista de compra sugerida.
import type { Product } from '../db/database';

export const LOW_STOCK_KEY = 'bar_lowStockThreshold';

export function readLowStockThreshold(): number {
  try {
    const v = localStorage.getItem(LOW_STOCK_KEY);
    if (v !== null && v !== '' && !Number.isNaN(Number(v))) return Math.max(0, Number(v));
  } catch { /* sin storage */ }
  return 5;
}

export function saveLowStockThreshold(n: number) {
  try { localStorage.setItem(LOW_STOCK_KEY, String(Math.max(0, n))); } catch { /* sin storage */ }
}

/** Mínimo efectivo: el del producto si está cargado, si no el umbral general. */
export const minFor = (p: Pick<Product, 'minStock'>, threshold: number) =>
  p.minStock != null && !Number.isNaN(Number(p.minStock)) ? Number(p.minStock) : threshold;

/** Stock bajo: por debajo de su mínimo (o en el mínimo, si el producto tiene uno propio). */
export function isLowStock(p: Pick<Product, 'stock' | 'minStock'>, threshold: number): boolean {
  const stock = Number(p.stock) || 0;
  return p.minStock != null ? stock <= Number(p.minStock) : stock < threshold;
}

/** Cantidad sugerida para reponer hasta el doble del mínimo. */
export function suggestedQty(p: Pick<Product, 'stock' | 'minStock'>, threshold: number): number {
  const target = Math.max(1, minFor(p, threshold) * 2);
  return Math.max(0, Math.ceil(target - (Number(p.stock) || 0)));
}

export interface PurchaseLine { id?: number; name: string; category: string; unit: string; stock: number; min: number; qty: number; unitCost: number; subtotal: number; }

export function buildPurchaseList(products: Product[], threshold: number): PurchaseLine[] {
  return products
    .filter(p => isLowStock(p, threshold))
    .map(p => {
      const qty = suggestedQty(p, threshold);
      const unitCost = Number(p.cost) || 0;
      return { id: p.id, name: p.name, category: p.category, unit: p.unit, stock: Number(p.stock) || 0, min: minFor(p, threshold), qty, unitCost, subtotal: Math.round(qty * unitCost * 100) / 100 };
    })
    .filter(l => l.qty > 0)
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}
