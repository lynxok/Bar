import React, { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { db } from '../db/database';
import { 
  Utensils, Search, Check, X, Smartphone, Globe, Eye, 
  EyeOff, DollarSign, Package, Layers, Info, Edit3
} from 'lucide-react';
import { cn } from '../lib/utils';

export function MenuConfig() {
  const { products } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editingDesc, setEditingDesc] = useState('');

  // Extract unique categories
  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category)))];

  // Filtered catalog
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleMenuAvailability = async (productId: number, currentStatus?: string) => {
    const nextStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
    try {
      await db.products.update(productId, { status: nextStatus });
    } catch (err) {
      console.error('Error al cambiar disponibilidad:', err);
    }
  };

  const handleSaveDescription = async (productId: number) => {
    try {
      await db.products.update(productId, { description: editingDesc });
      setEditingProductId(null);
      setEditingDesc('');
    } catch (err) {
      console.error('Error al guardar descripción:', err);
    }
  };

  // Preview Data: only active menu items
  const previewProducts = products.filter(p => p.status !== 'inactive');
  const previewCategories = ['Todos', ...Array.from(new Set(previewProducts.map(p => p.category)))];
  const [previewActiveCategory, setPreviewActiveCategory] = useState('Todos');

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-slate-100 select-none">
      
      {/* Left panel: Catalog Configuration */}
      <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-slate-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-black text-2xl text-slate-900 tracking-tight flex items-center gap-2">
                <Utensils className="w-6 h-6 text-indigo-500" /> Configuración de Carta / Menú
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Define qué productos de tu stock están visibles para tus clientes en el menú digital.</p>
            </div>
            <div className="flex items-center gap-2 text-xs bg-indigo-50 text-indigo-650 px-3.5 py-1.5 rounded-full font-bold border border-indigo-100">
              <Globe className="w-3.5 h-3.5" /> Carta Digital Online Activa
            </div>
          </div>

          {/* Search & Tabs */}
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Buscar platos o insumos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 pl-9 pr-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-colors shrink-0",
                    selectedCategory === cat
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-white border border-slate-250 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable list of products */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-slate-400 border border-dashed border-slate-200 rounded-3xl">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-slate-600">No se encontraron productos</p>
              <p className="text-xs text-slate-400 mt-1">Modifica la búsqueda o los filtros de categorías.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredProducts.map((prod) => {
                const isMenuAvailable = prod.status !== 'inactive';
                const isEditing = editingProductId === prod.id;

                return (
                  <div 
                    key={prod.id} 
                    className={cn(
                      "bg-white border rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between gap-4",
                      isMenuAvailable 
                        ? "border-slate-200 hover:shadow-md" 
                        : "border-slate-100 bg-slate-50/50 opacity-75"
                    )}
                  >
                    <div className="flex justify-between items-start gap-4">
                      {/* Left side details */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {prod.category}
                          </span>
                          {!isMenuAvailable && (
                            <span className="text-[9px] bg-amber-50 text-amber-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-amber-100">
                              <EyeOff className="w-2.5 h-2.5" /> Oculto en carta
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-800 text-base truncate">{prod.name}</h4>
                        
                        {/* Description editor */}
                        {isEditing ? (
                          <div className="mt-2 flex gap-2">
                            <input 
                              type="text" 
                              value={editingDesc}
                              onChange={(e) => setEditingDesc(e.target.value)}
                              placeholder="Ej: Jugosa carne con doble cheddar..."
                              className="w-full text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                              autoFocus
                            />
                            <button 
                              onClick={() => handleSaveDescription(prod.id!)}
                              className="p-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setEditingProductId(null)}
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p 
                            onClick={() => {
                              setEditingProductId(prod.id!);
                              setEditingDesc(prod.description || '');
                            }}
                            className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2 cursor-pointer hover:bg-slate-50 p-1 rounded group flex items-center gap-1.5"
                          >
                            {prod.description || <span className="text-slate-400 italic">Haz clic para agregar descripción...</span>}
                            <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-500 shrink-0" />
                          </p>
                        )}
                      </div>

                      {/* Right side Toggle Switch */}
                      <button
                        onClick={() => toggleMenuAvailability(prod.id!, prod.status)}
                        className={cn(
                          "w-12 h-6.5 rounded-full p-1 transition-colors relative shrink-0",
                          isMenuAvailable ? "bg-indigo-655" : "bg-slate-300"
                        )}
                      >
                        <div 
                          className={cn(
                            "w-4.5 h-4.5 rounded-full bg-white transition-transform shadow-md flex items-center justify-center",
                            isMenuAvailable ? "translate-x-5.5" : "translate-x-0"
                          )}
                        >
                          {isMenuAvailable ? (
                            <Eye className="w-2.5 h-2.5 text-indigo-600" />
                          ) : (
                            <EyeOff className="w-2.5 h-2.5 text-slate-400" />
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Bottom: prices and status */}
                    <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-2 shrink-0">
                      <div className="flex gap-3 text-xs text-slate-500 font-semibold">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Local: 
                          <strong className="text-slate-800">${prod.price?.toLocaleString() || '0'}</strong>
                        </span>
                        {prod.takeawayPrice != null && prod.takeawayPrice > 0 && (
                          <span className="flex items-center gap-1 border-l border-slate-200 pl-3">
                            Llevar: 
                            <strong className="text-indigo-600">${prod.takeawayPrice.toLocaleString()}</strong>
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400">
                        Stock: {prod.stock || 0} {prod.unit || 'u'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Live smartphone mockup preview */}
      <div className="w-[380px] bg-slate-900 p-6 flex flex-col justify-center items-center shrink-0 border-l border-slate-950">
        <div className="text-center mb-4 text-slate-400">
          <h4 className="text-sm font-black text-white flex items-center gap-2 justify-center">
            <Smartphone className="w-4 h-4 text-indigo-400" /> Vista Previa del Cliente
          </h4>
          <p className="text-[10px] mt-1 text-slate-500">Así es como tus clientes ven la carta digital en sus celulares.</p>
        </div>

        {/* Smartphone Frame */}
        <div className="w-[280px] h-[560px] bg-slate-950 rounded-[2.5rem] p-3 shadow-2xl border-4 border-slate-850 relative flex flex-col overflow-hidden">
          {/* Speaker & camera slot */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-950 rounded-full z-50 flex items-center justify-center">
            <div className="w-8 h-1 bg-slate-800 rounded-full" />
          </div>

          {/* Smartphone Screen simulator */}
          <div className="flex-1 bg-white rounded-[2rem] overflow-hidden flex flex-col pt-3 relative text-slate-800 select-none">
            {/* Fake status bar */}
            <div className="px-4 py-1 flex justify-between items-center text-[9px] font-bold text-slate-450 shrink-0 select-none">
              <span>9:41</span>
              <div className="flex gap-1 items-center">
                <span>5G</span>
                <div className="w-4 h-2 bg-slate-400 rounded-sm" />
              </div>
            </div>

            {/* Client summary fake header */}
            <div className="px-4 py-3 bg-slate-900 text-white shrink-0">
              <h5 className="font-black text-xs">MESA #05</h5>
              <p className="text-[9px] text-indigo-300">Escanea la carta & haz tu pedido</p>
            </div>

            {/* Fake category slider */}
            <div className="px-4 py-2 border-b border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0 bg-slate-50">
              {previewCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setPreviewActiveCategory(cat)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[9px] font-black uppercase whitespace-nowrap transition-colors",
                    previewActiveCategory === cat 
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200 text-slate-500"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Fake list of active products */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
              {previewProducts.filter(p => previewActiveCategory === 'Todos' || p.category === previewActiveCategory).map(prod => (
                <div key={prod.id} className="bg-white p-2.5 rounded-xl border border-slate-150 flex justify-between items-start gap-2 shadow-sm">
                  <div className="min-w-0">
                    <h6 className="font-bold text-[10px] text-slate-800 truncate">{prod.name}</h6>
                    <p className="text-[8px] text-slate-450 line-clamp-1 leading-normal">{prod.description || 'Sin descripción'}</p>
                    <span className="text-[10px] font-black text-slate-700 block mt-1">${prod.price?.toLocaleString()}</span>
                  </div>
                  <button className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black shrink-0">
                    +
                  </button>
                </div>
              ))}
              {previewProducts.length === 0 && (
                <div className="text-center py-12 text-slate-450 text-[9px]">
                  No hay productos activos en la carta. Actívalos a la izquierda.
                </div>
              )}
            </div>

            {/* Fake bottom navigation bar */}
            <div className="px-4 py-3.5 border-t border-slate-200 bg-white flex justify-around items-center text-[9px] font-bold text-slate-450 shrink-0">
              <span className="text-indigo-650">Carta</span>
              <span>Mi Pedido</span>
              <span>Cuenta</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
