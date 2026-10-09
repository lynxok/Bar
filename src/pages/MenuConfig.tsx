import React, { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { db } from '../db/database';
import { 
  Utensils, Search, Check, X, Smartphone, Globe, Eye, 
  EyeOff, DollarSign, Package, Layers, Info, Edit3, ImagePlus, Trash2
} from 'lucide-react';
import { resizeImageFile } from '../lib/images';
import { useToast } from '../components/ui/Toast';
import { cn } from '../lib/utils';
import { formatMoney } from '../lib/format';

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

  const { showToast } = useToast();
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const handleImageFile = async (productId: number, file?: File | null) => {
    if (!file) return;
    setUploadingId(productId);
    try {
      const image = await resizeImageFile(file);
      await db.products.update(productId, { image });
      showToast('Foto guardada', 'success');
    } catch (err: any) {
      showToast(err?.message || 'No se pudo guardar la foto', 'error');
    } finally {
      setUploadingId(null);
    }
  };
  const handleRemoveImage = async (productId: number) => {
    await db.products.update(productId, { image: undefined });
    showToast('Foto quitada', 'success');
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
    <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-slate-100 select-none dark:bg-white/5">
      
      {/* Left panel: Catalog Configuration */}
      <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-slate-200 dark:bg-[var(--bg-surface)] dark:border-white/10">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 dark:bg-white/5 shrink-0 dark:border-white/10">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="font-light text-[28px] text-slate-900 tracking-tight flex items-center gap-2 dark:text-zinc-100">
                <Utensils className="w-6 h-6 text-brand dark:text-emerald-400" /> Configuración de Carta / Menú
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5 dark:text-zinc-400">Define qué productos de tu stock están visibles para tus clientes en el menú digital.</p>
            </div>
            <div className="flex items-center gap-2 text-xs bg-emerald-50 text-brand px-3.5 py-1.5 rounded-full font-bold border border-emerald-100 dark:text-emerald-400">
              <Globe className="w-3.5 h-3.5" /> Carta Digital Online Activa
            </div>
          </div>

          {/* Search & Tabs */}
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 dark:text-zinc-400" />
              <input 
                type="text"
                placeholder="Buscar platos o insumos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 pl-9 pr-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-brand outline-none font-medium dark:bg-[var(--bg-surface)] dark:border-white/10 dark:text-zinc-100"
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
                      ? "bg-brand-dark text-white shadow-md"
                      : "bg-white border border-slate-250 text-slate-600 hover:bg-slate-50 dark:bg-[var(--bg-surface)] dark:text-zinc-300 dark:hover:bg-white/5"
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
            <div className="text-center py-20 text-slate-400 border border-dashed border-slate-200 rounded-3xl dark:text-zinc-400 dark:border-white/10">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-slate-600 dark:text-zinc-300">No se encontraron productos</p>
              <p className="text-xs text-slate-400 mt-1 dark:text-zinc-400">Modifica la búsqueda o los filtros de categorías.</p>
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
                      "bg-white border rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between gap-4 dark:bg-[var(--bg-surface)]",
                      isMenuAvailable 
                        ? "border-slate-200 hover:shadow-md dark:border-white/10" 
                        : "border-slate-100 bg-slate-50/50 dark:bg-white/5 opacity-75 dark:border-white/10"
                    )}
                  >
                    <div className="flex justify-between items-start gap-4">
                      {/* Foto del producto */}
                      <div className="relative w-20 h-20 shrink-0 group/img">
                        <label
                          title={prod.image ? 'Cambiar foto' : 'Agregar foto'}
                          className={cn(
                            "w-20 h-20 rounded-xl overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-colors",
                            prod.image ? "border border-slate-200 dark:border-white/10" : "border-2 border-dashed border-slate-300 hover:border-brand text-slate-400 hover:text-brand dark:border-white/20 dark:text-zinc-400"
                          )}
                        >
                          {uploadingId === prod.id ? (
                            <span className="text-xs font-semibold">Subiendo…</span>
                          ) : prod.image ? (
                            <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <ImagePlus className="w-5 h-5" />
                              <span className="text-xs font-semibold mt-1">Foto</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => { handleImageFile(prod.id!, e.target.files?.[0]); e.target.value = ''; }}
                          />
                        </label>
                        {prod.image && uploadingId !== prod.id && (
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(prod.id!)}
                            title="Quitar foto"
                            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-slate-200 text-rose-600 shadow-sm flex items-center justify-center opacity-0 group-hover/img:opacity-100 focus:opacity-100 transition-opacity dark:bg-[var(--bg-surface)] dark:border-white/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {/* Left side details */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider dark:bg-white/5 dark:text-zinc-400">
                            {prod.category}
                          </span>
                          {!isMenuAvailable && (
                            <span className="text-xs bg-amber-50 text-amber-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-amber-100">
                              <EyeOff className="w-2.5 h-2.5" /> Oculto en carta
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-800 text-base line-clamp-2 leading-snug dark:text-zinc-100">{prod.name}</h4>
                        
                        {/* Description editor */}
                        {isEditing ? (
                          <div className="mt-2 flex gap-2">
                            <input 
                              type="text" 
                              value={editingDesc}
                              onChange={(e) => setEditingDesc(e.target.value)}
                              placeholder="Ej: Jugosa carne con doble cheddar..."
                              className="w-full text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-brand outline-none dark:bg-[var(--color-paper-subtle)] dark:border-white/10"
                              autoFocus
                            />
                            <button 
                              onClick={() => handleSaveDescription(prod.id!)}
                              className="p-1.5 bg-brand hover:bg-brand-hover text-white rounded-lg"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setEditingProductId(null)}
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg dark:text-zinc-300"
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
                            className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2 cursor-pointer hover:bg-slate-50 p-1 rounded group flex items-center gap-1.5 dark:text-zinc-400 dark:hover:bg-white/5"
                          >
                            {prod.description || <span className="text-slate-400 italic dark:text-zinc-400">Haz clic para agregar descripción...</span>}
                            <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-brand shrink-0 dark:text-emerald-400" />
                          </p>
                        )}
                      </div>

                      {/* Right side Toggle Switch */}
                      <button
                        onClick={() => toggleMenuAvailability(prod.id!, prod.status)}
                        className={cn(
                          "w-12 h-6.5 rounded-full p-1 transition-colors relative shrink-0",
                          isMenuAvailable ? "bg-brand" : "bg-slate-300"
                        )}
                      >
                        <div 
                          className={cn(
                            "w-4.5 h-4.5 rounded-full bg-white transition-transform shadow-md flex items-center justify-center dark:bg-[var(--bg-surface)]",
                            isMenuAvailable ? "translate-x-5.5" : "translate-x-0"
                          )}
                        >
                          {isMenuAvailable ? (
                            <Eye className="w-2.5 h-2.5 text-brand dark:text-emerald-400" />
                          ) : (
                            <EyeOff className="w-2.5 h-2.5 text-slate-400 dark:text-zinc-400" />
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Bottom: prices and status */}
                    <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-2 shrink-0 dark:border-white/10">
                      <div className="flex gap-3 text-xs text-slate-500 font-semibold dark:text-zinc-400">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" /> Local: 
                          <strong className="text-slate-800 dark:text-zinc-100">{formatMoney(prod.price || 0)}</strong>
                        </span>
                        {prod.takeawayPrice != null && prod.takeawayPrice > 0 && (
                          <span className="flex items-center gap-1 border-l border-slate-200 pl-3 dark:border-white/10">
                            Llevar: 
                            <strong className="text-brand dark:text-emerald-400">{formatMoney(prod.takeawayPrice)}</strong>
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-400 dark:text-zinc-400">
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
      <div className="w-[380px] bg-brand-dark p-6 flex flex-col justify-center items-center shrink-0 border-l border-emerald-950">
        <div className="text-center mb-4 text-slate-400 dark:text-zinc-400">
          <h4 className="text-sm font-black text-white flex items-center gap-2 justify-center">
            <Smartphone className="w-4 h-4 text-emerald-400" /> Vista Previa del Cliente
          </h4>
          <p className="text-xs mt-1 text-slate-500 dark:text-zinc-400">Así es como tus clientes ven la carta digital en sus celulares.</p>
        </div>

        {/* Smartphone Frame */}
        <div className="w-[280px] h-[560px] bg-dark-bg rounded-[2.5rem] p-3 shadow-2xl border-4 border-white/10 relative flex flex-col overflow-hidden">
          {/* Speaker & camera slot */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-dark-bg rounded-full z-50 flex items-center justify-center">
            <div className="w-8 h-1 bg-slate-800 rounded-full" />
          </div>

          {/* Smartphone Screen simulator */}
          <div className="flex-1 bg-white rounded-[2rem] overflow-hidden flex flex-col pt-3 relative text-slate-800 select-none dark:bg-[var(--bg-surface)] dark:text-zinc-100">
            {/* Fake status bar */}
            <div className="px-4 py-1 flex justify-between items-center text-xs font-bold text-slate-450 shrink-0 select-none">
              <span>9:41</span>
              <div className="flex gap-1 items-center">
                <span>5G</span>
                <div className="w-4 h-2 bg-slate-400 rounded-sm" />
              </div>
            </div>

            {/* Client summary fake header */}
            <div className="px-4 py-3 bg-brand-dark text-white shrink-0">
              <h5 className="font-black text-xs">MESA #05</h5>
              <p className="text-xs text-emerald-300">Escanea la carta & haz tu pedido</p>
            </div>

            {/* Fake category slider */}
            <div className="px-4 py-2 border-b border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0 bg-slate-50 dark:border-white/10 dark:bg-[var(--color-paper-subtle)]">
              {previewCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setPreviewActiveCategory(cat)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-black uppercase whitespace-nowrap transition-colors",
                    previewActiveCategory === cat 
                      ? "bg-brand-dark text-white"
                      : "bg-slate-200 text-slate-500 dark:text-zinc-400"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Fake list of active products */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50 dark:bg-[var(--color-paper-subtle)]">
              {previewProducts.filter(p => previewActiveCategory === 'Todos' || p.category === previewActiveCategory).map(prod => (
                <div key={prod.id} className="bg-white p-2.5 rounded-xl border border-slate-150 flex justify-between items-start gap-2 shadow-sm dark:bg-[var(--bg-surface)]">
                  {prod.image && <img src={prod.image} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <h6 className="font-bold text-xs text-slate-800 truncate dark:text-zinc-100">{prod.name}</h6>
                    <p className="text-xs text-slate-450 line-clamp-1 leading-normal">{prod.description || 'Sin descripción'}</p>
                    <span className="text-xs font-black text-slate-700 block mt-1 dark:text-zinc-300">{formatMoney(prod.price || 0)}</span>
                  </div>
                  <button className="p-1 bg-brand hover:bg-brand-hover text-white rounded-lg text-xs font-black shrink-0">
                    +
                  </button>
                </div>
              ))}
              {previewProducts.length === 0 && (
                <div className="text-center py-12 text-slate-450 text-xs">
                  No hay productos activos en la carta. Actívalos a la izquierda.
                </div>
              )}
            </div>

            {/* Fake bottom navigation bar */}
            <div className="px-4 py-3.5 border-t border-slate-200 bg-white flex justify-around items-center text-xs font-bold text-slate-450 shrink-0 dark:border-white/10 dark:bg-[var(--bg-surface)]">
              <span className="text-brand dark:text-emerald-400">Carta</span>
              <span>Mi Pedido</span>
              <span>Cuenta</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
