import { useState } from 'react';
import { Search, X, ChefHat, Wallet, Plus, Minus, Smartphone, Flame, AlertTriangle, Beer } from 'lucide-react';
import { MugFillModal } from '../../components/mugs/MugFillModal';
import { cn } from '../../lib/utils';
import { formatMoney } from '../../lib/format';
import type { OrderItem } from '../../contexts/StoreContext';

interface OrderPanelProps {
  tableId: string;
  orderItems: OrderItem[];
  menuItems: any[];
  total: number;
  onClose: () => void;
  onAddItem: (item: any) => void;
  onRemoveItem: (itemId: any) => void;
  onSendToKitchen: () => void;
  onOpenPayment: () => void;
  onOpenQr: () => void;
}

export function OrderPanel({
  tableId,
  orderItems,
  menuItems,
  total,
  onClose,
  onAddItem,
  onRemoveItem,
  onSendToKitchen,
  onOpenPayment,
  onOpenQr,
}: OrderPanelProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [mugFillOpen, setMugFillOpen] = useState(false);

  const categories = ['Todos', ...Array.from(new Set(menuItems.map(i => i.category || 'Otros')))];

  // Sort popular items (by prepCount or explicit popular flag)
  const sortedItems = [...menuItems].sort((a, b) => (b.prepCount || 0) - (a.prepCount || 0));

  const filteredItems = sortedItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                          (item.category && item.category.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl w-full max-w-7xl h-[88vh] flex flex-col md:flex-row overflow-hidden border border-slate-200 dark:border-white/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Left catalog area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-dark-subtle">
          {/* Header */}
          <div className="p-6 bg-white dark:bg-dark-card border-b border-slate-200 dark:border-white/10 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-2xl text-ink dark:text-white tracking-tight">
                Mesa {tableId.replace('M-', '').replace('T-', '')}
              </h3>
              <button
                onClick={onOpenQr}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-brand/20 hover:bg-emerald-100 text-brand dark:text-emerald-400 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <Smartphone className="w-4 h-4" /> QR mesa
              </button>
              <button
                onClick={() => setMugFillOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <Beer className="w-4 h-4" /> Recarga de vaso
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer dark:text-zinc-400"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search bar & Categories tabs */}
          <div className="p-6 pb-3 space-y-3 shrink-0 bg-white/60 dark:bg-dark-card/60 border-b border-slate-200 dark:border-white/10">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 dark:text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar plato, bebida o categoría..."
                className="w-full h-11 pl-10 pr-4 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl font-medium text-sm text-slate-900 dark:text-white outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer",
                    selectedCategory === cat
                      ? "bg-brand border-brand text-white shadow-xs"
                      : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog grid: 4-5 columns on desktop */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 content-start">
            {filteredItems.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-400 text-sm font-semibold dark:text-zinc-400">
                No se encontraron productos disponibles.
              </div>
            ) : (
              filteredItems.map(item => {
                const isLowStock = item.stock !== undefined && item.stock <= (item.minStock || 3) && item.stock > 0;
                const isOutOfStock = item.stock !== undefined && item.stock <= 0;
                const isPopular = item.prepCount && item.prepCount >= 5;

                return (
                  <button
                    key={item.id}
                    disabled={isOutOfStock}
                    onClick={() => onAddItem(item)}
                    className={cn(
                      "bg-white dark:bg-dark-card p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs hover:shadow-md hover:border-brand transition-all text-left flex flex-col justify-between min-h-[110px] cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed",
                      isOutOfStock && "opacity-50"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-semibold text-brand dark:text-emerald-400 uppercase tracking-wider truncate">
                          {item.category}
                        </span>
                        {isPopular && (
                          <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.5 rounded-md">
                            <Flame className="w-2.5 h-2.5" /> Top
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-slate-800 dark:text-white text-xs leading-snug line-clamp-2">
                        {item.name}
                      </h4>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                      <span className="font-bold text-ink dark:text-white text-sm tabular-nums">
                        {formatMoney(item.price)}
                      </span>
                      {isLowStock && (
                        <span className="text-xs font-bold text-accent flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> {item.stock} u.
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right order ticket area */}
        <div className="w-full md:w-[420px] bg-white dark:bg-dark-card flex flex-col p-6 shrink-0 border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
            <h3 className="font-bold text-lg text-ink dark:text-white">Pedido actual</h3>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {orderItems.reduce((acc, it) => acc + it.qty, 0)} ítems
            </span>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
            {orderItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12 dark:text-zinc-400">
                <p className="text-sm font-semibold">Sin consumos cargados</p>
                <p className="text-xs text-slate-500 mt-1 dark:text-zinc-400">Seleccioná ítems de la carta para añadirlos a la mesa.</p>
              </div>
            ) : (
              orderItems.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-150 dark:border-white/5"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="font-semibold text-slate-800 dark:text-white text-xs truncate">
                      {item.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                      {formatMoney(item.price)} × {item.qty}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold w-4 text-center text-xs tabular-nums text-slate-800 dark:text-white">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => onAddItem(item)}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals & Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total consumido
              </span>
              <span className="text-2xl font-bold text-ink dark:text-white tabular-nums">
                {formatMoney(total)}
              </span>
            </div>

            <button
              disabled={orderItems.length === 0}
              onClick={onSendToKitchen}
              className="w-full min-h-[46px] py-3 bg-brand hover:bg-brand-hover text-white rounded-xl font-semibold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              <ChefHat className="w-4 h-4" /> Enviar a cocina
            </button>

            <button
              disabled={orderItems.length === 0}
              onClick={onOpenPayment}
              className="w-full min-h-[48px] py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold text-sm uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              <Wallet className="w-4 h-4" /> Cobrar cuenta
            </button>
          </div>
        </div>
      </div>
      <MugFillModal isOpen={mugFillOpen} onClose={() => setMugFillOpen(false)} onAdd={onAddItem} />
    </div>
  );
}
