import { Printer, ShoppingCart, Sheet, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Product } from '../db/database';
import { buildPurchaseList } from '../lib/stock';
import { formatMoney } from '../lib/format';

const money = (n: number) => formatMoney(n);


/** Lista de compra sugerida a partir del stock mínimo de cada producto/insumo. */
export function PurchaseListModal({ products, threshold, onClose }: { products: Product[]; threshold: number; onClose: () => void }) {
  const lines = buildPurchaseList(products, threshold);
  const total = lines.reduce((a, l) => a + l.subtotal, 0);

  const exportExcel = () => {
    const rows = lines.map(l => ({
      Categoría: l.category, Producto: l.name, Unidad: l.unit, 'Stock actual': l.stock,
      'Stock mínimo': l.min, 'A comprar': l.qty, 'Costo unitario': l.unitCost, Subtotal: l.subtotal,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Compra sugerida');
    XLSX.writeFile(wb, `compra-sugerida-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const print = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
    w.document.write(`<html><head><title>Compra sugerida</title><style>
      body{font-family:sans-serif;padding:24px} table{border-collapse:collapse;width:100%} td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left;font-size:12px} th{background:#f1f5f9}
    </style></head><body><h2>Lista de compra sugerida — ${new Date().toLocaleDateString('es-AR')}</h2>
    <table><tr><th>Categoría</th><th>Producto</th><th>Stock</th><th>Mínimo</th><th>Comprar</th><th>Subtotal</th></tr>
    ${lines.map(l => `<tr><td>${esc(l.category)}</td><td>${esc(l.name)}</td><td>${l.stock} ${esc(l.unit)}</td><td>${l.min}</td><td><b>${l.qty}</b></td><td>${money(l.subtotal)}</td></tr>`).join('')}
    </table><h3>Total estimado: ${money(total)}</h3><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-black text-xl text-slate-900 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-indigo-600" /> Lista de compra sugerida</h3>
            <p className="text-xs text-slate-500">Productos e insumos por debajo de su stock mínimo. Se sugiere reponer hasta el doble del mínimo.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500"><X className="w-6 h-6" /></button>
        </div>
        <div className="overflow-y-auto p-6">
          {lines.length === 0 ? (
            <div className="text-center text-slate-400 font-bold py-10">No hay nada para reponer. 🎉</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[10px] uppercase text-slate-400">
                <th className="py-2">Producto</th><th>Stock</th><th>Mínimo</th><th>Comprar</th><th className="text-right">Subtotal</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map(l => (
                  <tr key={`${l.id}-${l.name}`}>
                    <td className="py-2"><div className="font-bold text-slate-800">{l.name}</div><div className="text-[11px] text-slate-400">{l.category}</div></td>
                    <td className="text-rose-600 font-bold">{l.stock} {l.unit}</td>
                    <td>{l.min}</td>
                    <td className="font-black">{l.qty}</td>
                    <td className="text-right">{l.unitCost ? money(l.subtotal) : <span className="text-slate-400 text-xs">sin costo</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="p-6 border-t border-slate-100 flex items-center justify-between">
          <span className="font-black text-slate-900">Total estimado: {money(total)}</span>
          <div className="flex gap-2">
            <button onClick={exportExcel} disabled={!lines.length} className="px-4 h-10 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"><Sheet className="w-4 h-4" /> Excel</button>
            <button onClick={print} disabled={!lines.length} className="px-4 h-10 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"><Printer className="w-4 h-4" /> Imprimir</button>
          </div>
        </div>
      </div>
    </div>
  );
}
