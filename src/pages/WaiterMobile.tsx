import React, { useState } from 'react';
import { useStore, OrderItem } from '../contexts/StoreContext';
import { LogOut, ArrowLeft, Plus, Minus, Search, Layers } from 'lucide-react';

export function WaiterMobile() {
  const { tables, products, addComanda, updateTableOrder } = useStore();
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  
  // Waiter status filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Cart/Comanda loading local state
  const [comandaItems, setComandaItems] = useState<{ id: string; name: string; price: number; qty: number; note: string }[]>([]);
  
  // Product Search/Filter
  const [productSearch, setProductSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('bar_user');
    window.location.reload();
  };

  const STATUS_LABELS: Record<string, string> = {
    available: "Libre",
    occupied_no_order: "Ocupado",
    waiting_food: "Espera",
    consuming: "Consumiendo",
    checkout: "Cuenta",
    dirty: "Sucia",
    occupied: "Ocupado"
  };

  const STATUS_CLASSES: Record<string, string> = {
    available: "bg-emerald-500 text-white border-emerald-600",
    occupied_no_order: "bg-sky-500 text-white border-sky-600",
    waiting_food: "bg-amber-500 text-white border-amber-600",
    consuming: "bg-purple-500 text-white border-purple-600",
    checkout: "bg-rose-500 text-white border-rose-600",
    dirty: "bg-stone-500 text-white border-stone-600",
    occupied: "bg-rose-500 text-white border-rose-600"
  };

  // Filter Tables
  const filteredTables = tables.filter(table => {
    const matchesStatus = statusFilter === 'all' || table.status === statusFilter;
    const matchesSearch = table.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (table.label && table.label.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Unique categories for products
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  // Filter Products
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                          product.sku.toLowerCase().includes(productSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Cart operations
  const handleSelectTable = (tableId: string) => {
    setSelectedTableId(tableId);
    setComandaItems([]);
    setProductSearch('');
    setSelectedCategory('all');
  };

  const handleAddProduct = (product: typeof products[0]) => {
    setComandaItems(prev => {
      const existing = prev.find(item => item.name === product.name);
      if (existing) {
        return prev.map(item => item.name === product.name ? { ...item, qty: item.qty + 1 } : item);
      } else {
        return [...prev, {
          id: product.id?.toString() || `prod-${Date.now()}`,
          name: product.name,
          price: product.price,
          qty: 1,
          note: ''
        }];
      }
    });
  };

  const handleUpdateQty = (name: string, delta: number) => {
    setComandaItems(prev => prev.map(item => {
      if (item.name === name) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean) as typeof comandaItems);
  };

  const handleUpdateNote = (name: string, note: string) => {
    setComandaItems(prev => prev.map(item => item.name === name ? { ...item, note } : item));
  };

  const handleConfirmAndSend = async () => {
    if (!selectedTableId || comandaItems.length === 0) return;

    try {
      // 1. Add Comanda (items with notes)
      const comandaPayload = comandaItems.map(item => ({
        name: item.note ? `${item.name} (${item.note})` : item.name,
        price: item.price,
        qty: item.qty
      }));
      await addComanda(selectedTableId, comandaPayload);

      // 2. Update Table Order state in local DB / context
      const table = tables.find(t => t.id === selectedTableId);
      const currentOrderItems: OrderItem[] = table && Array.isArray(table.order) ? [...table.order] : [];

      for (const item of comandaItems) {
        const existingItem = currentOrderItems.find(i => i.name === item.name);
        if (existingItem) {
          existingItem.qty += item.qty;
        } else {
          currentOrderItems.push({
            id: item.id,
            name: item.name,
            price: item.price,
            qty: item.qty
          });
        }
      }

      await updateTableOrder(selectedTableId, currentOrderItems);
      
      // Reset back to tables screen
      setSelectedTableId(null);
      setComandaItems([]);
      triggerToast(`Comanda enviada con éxito para la Mesa ${selectedTableId.replace('T-', '')}`, 'success');
    } catch (err) {
      console.error(err);
      triggerToast('Error al enviar la comanda.', 'error');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100 max-w-[430px] mx-auto border-x border-slate-800 shadow-2xl relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`absolute top-4 left-4 right-4 z-50 p-4 rounded-xl border shadow-2xl transition-all duration-300 transform translate-y-0 flex items-center justify-between ${
          toast.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' 
            : 'bg-red-950/90 border-red-500/50 text-red-200'
        }`}>
          <div className="text-sm font-semibold">{toast.message}</div>
          <button onClick={() => setToast(null)} className="text-xs opacity-60 hover:opacity-100">Cerrar</button>
        </div>
      )}

      {/* Header */}
      <header className="h-16 bg-slate-950 flex items-center justify-between px-4 border-b border-slate-800 shrink-0 sticky top-0 z-50">
        <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
          <span className="bg-indigo-600 p-1.5 rounded-lg text-white">L</span>
          LYNX BarOS <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-normal">Mozos</span>
        </h1>
        <button 
          onClick={handleLogout}
          className="p-2 bg-slate-900 hover:bg-red-950 hover:text-red-400 text-slate-400 rounded-lg transition-colors border border-slate-800"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Body */}
      <main className="flex-1 overflow-y-auto pb-24">
        {!selectedTableId ? (
          /* View 1: Tables List */
          <div className="p-4 space-y-4">
            
            {/* Search & Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input 
                  type="text"
                  placeholder="Buscar mesa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              {/* Status Filter Slider */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === 'all' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  Todas ({tables.length})
                </button>
                {Object.keys(STATUS_LABELS).map((statusKey) => {
                  const count = tables.filter(t => t.status === statusKey).length;
                  if (count === 0 && statusKey !== 'available' && statusKey !== 'occupied_no_order') return null;
                  return (
                    <button
                      key={statusKey}
                      onClick={() => setStatusFilter(statusKey)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                        statusFilter === statusKey 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${STATUS_CLASSES[statusKey].split(' ')[0]}`}></span>
                      {STATUS_LABELS[statusKey]} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-2 gap-3">
              {filteredTables.map(table => {
                const totalAccumulated = Array.isArray(table.order) 
                  ? table.order.reduce((sum, item) => sum + (item.price * item.qty), 0)
                  : 0;

                return (
                  <button
                    key={table.id}
                    onClick={() => handleSelectTable(table.id)}
                    className="flex flex-col justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-indigo-600 text-left min-h-[110px] transition-all relative overflow-hidden active:scale-95 duration-100"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-white">
                          #{table.id.replace('T-', '')}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase border ${STATUS_CLASSES[table.status]}`}>
                          {STATUS_LABELS[table.status]}
                        </span>
                      </div>
                      {table.label && (
                        <p className="text-xs text-slate-400 mt-1 font-medium truncate">{table.label}</p>
                      )}
                    </div>

                    <div className="mt-2 flex items-end justify-between">
                      <span className="text-xs text-slate-500">Cap: {table.capacity}</span>
                      {totalAccumulated > 0 && (
                        <span className="text-sm font-bold text-emerald-400">${totalAccumulated.toLocaleString()}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredTables.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No se encontraron mesas.</p>
              </div>
            )}
          </div>
        ) : (
          /* View 2: Add Comanda */
          <div className="p-4 space-y-4">
            
            {/* Header / Back */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedTableId(null)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl border border-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Volver
              </button>
              <div className="text-lg font-bold text-white">
                Mesa #{selectedTableId.replace('T-', '')}
              </div>
            </div>

            {/* Product Selector */}
            <div className="space-y-3 bg-slate-950 p-3 rounded-2xl border border-slate-800/80">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input 
                  type="text"
                  placeholder="Buscar plato o bebida..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-600 focus:ring-1"
                />
              </div>

              {/* Categories Horizontal */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap capitalize transition-colors ${
                      selectedCategory === cat 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {cat === 'all' ? 'Todos' : cat}
                  </button>
                ))}
              </div>

              {/* Products List */}
              <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto">
                {filteredProducts.map(prod => (
                  <button
                    key={prod.id}
                    onClick={() => handleAddProduct(prod)}
                    className="flex justify-between items-center p-3 bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800 text-left active:scale-95 duration-75"
                  >
                    <div>
                      <div className="font-semibold text-white text-sm">{prod.name}</div>
                      <div className="text-xs text-slate-400 capitalize">{prod.category}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-emerald-400">${prod.price}</span>
                      <div className="bg-indigo-600/20 text-indigo-400 p-1.5 rounded-lg border border-indigo-500/30">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                ))}

                {filteredProducts.length === 0 && (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    No se encontraron productos.
                  </div>
                )}
              </div>
            </div>

            {/* Current Comanda Cart */}
            <div className="space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>Comanda Actual ({comandaItems.reduce((acc, i) => acc + i.qty, 0)})</span>
              </h3>

              <div className="space-y-3">
                {comandaItems.map(item => (
                  <div key={item.name} className="bg-slate-950 border border-slate-800 p-3 rounded-2xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-sm">{item.name}</h4>
                        <p className="text-xs font-semibold text-slate-400">${(item.price * item.qty).toLocaleString()}</p>
                      </div>

                      {/* Quantity Selector - Minimum 48px target */}
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
                        <button
                          onClick={() => handleUpdateQty(item.name, -1)}
                          className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-800 active:scale-90 rounded-lg transition-all"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-white">{item.qty}</span>
                        <button
                          onClick={() => handleUpdateQty(item.name, 1)}
                          className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:bg-slate-800 active:scale-90 rounded-lg transition-all"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline note for this specific comanda item */}
                    <input 
                      type="text"
                      placeholder="Nota (Ej: Sin cebolla, término medio, hielo)"
                      value={item.note}
                      onChange={(e) => handleUpdateNote(item.name, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-600 focus:ring-1"
                    />
                  </div>
                ))}

                {comandaItems.length === 0 && (
                  <div className="text-center py-10 bg-slate-950 border border-slate-800/80 rounded-2xl text-slate-500 text-sm">
                    La comanda está vacía. Añade productos desde la lista de arriba.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Sticky Footer for Comanda Checkout */}
      {selectedTableId && comandaItems.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-950 border-t border-slate-800 sticky z-40">
          <button
            onClick={handleConfirmAndSend}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] text-base tracking-wide"
          >
            CONFIRMAR Y ENVIAR A COCINA
          </button>
        </div>
      )}

    </div>
  );
}
