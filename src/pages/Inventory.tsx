import { useState, useEffect, Fragment } from "react";
import {
  Package,
  ArrowUpRight,
  AlertTriangle,
  Receipt,
  Truck,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Upload,
  Download,
  Plus,
  X,
  Image as ImageIcon,
  Save,
  Search,
  Layers,
  History
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAlerts } from "../contexts/AlertContext";
import { useStore } from "../contexts/StoreContext";
import { LoggerService } from "../lib/LoggerService";

export const INITIAL_CATEGORIES = [
  'Licores / Scotch',
  'Productos Secos / Café',
  'Comida',
  'Bebida',
  'Postre'
];

export function Inventory() {
  const { products, setProducts } = useStore();
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [ingredients, setIngredients] = useState<{id: string, name: string, quantity: number, unit: string}[]>([]);
  const [hasVariants, setHasVariants] = useState(false);
  const [newProductVariants, setNewProductVariants] = useState<{id: string, name: string, sku: string, price: number, takeawayPrice: number}[]>([]);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const { setLowStockCount } = useAlerts();

  // New Product Modal State
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState(INITIAL_CATEGORIES[0]);
  const [newProductSKU, setNewProductSKU] = useState('');
  const [newProductBarcode, setNewProductBarcode] = useState('');
  const [newProductPrice, setNewProductPrice] = useState<number | ''>('');
  const [newProductTakeawayPrice, setNewProductTakeawayPrice] = useState<number | ''>('');
  const [newProductStock, setNewProductStock] = useState(0);
  const [newProductUnit, setNewProductUnit] = useState('Unidades');

  const [categoryFilter, setCategoryFilter] = useState('Todas las Categorías');
  const [stockStatusFilter, setStockStatusFilter] = useState('Todos los Estados');

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', sku: '', barcode: '', price: 0, takeawayPrice: 0 });
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({'2': true});
  const [historyModalItem, setHistoryModalItem] = useState<any>(null);

  useEffect(() => {
    const count = products.filter(p => p.stock < lowStockThreshold).length;
    setLowStockCount(count);
  }, [products, lowStockThreshold, setLowStockCount]);

  const startEditing = (product: any) => {
    setEditingRowId(product.id);
    setEditForm({ 
      name: product.name || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      price: product.price || 0, 
      takeawayPrice: product.takeawayPrice || 0 
    });
  };

  const saveEditing = async () => {
    if (editingRowId) {
      const product = products.find(p => p.id === editingRowId);
      await setProducts(products.map(p => {
        if (p.id === editingRowId) {
          const historyEntry = (p.price !== editForm.price || p.takeawayPrice !== editForm.takeawayPrice) 
            ? { date: new Date().toISOString(), oldPrice: p.price, newPrice: editForm.price, oldTakeaway: p.takeawayPrice, newTakeaway: editForm.takeawayPrice }
            : null;
          const newHistory = historyEntry ? [historyEntry, ...(p.priceHistory || [])] : (p.priceHistory || []);
          return { ...p, name: editForm.name, sku: editForm.sku, barcode: editForm.barcode, price: editForm.price, takeawayPrice: editForm.takeawayPrice, priceHistory: newHistory };
        }
        if (p.variants) {
          const vIndex = p.variants.findIndex((v: any) => v.id === editingRowId);
          if (vIndex !== -1) {
            const v = p.variants[vIndex];
            const historyEntry = (v.price !== editForm.price || v.takeawayPrice !== editForm.takeawayPrice)
              ? { date: new Date().toISOString(), oldPrice: v.price, newPrice: editForm.price, oldTakeaway: v.takeawayPrice, newTakeaway: editForm.takeawayPrice }
              : null;
            const newHistory = historyEntry ? [historyEntry, ...(v.priceHistory || [])] : (v.priceHistory || []);
            const newVariants = [...p.variants];
            newVariants[vIndex] = { ...v, name: editForm.name, sku: editForm.sku, barcode: editForm.barcode, price: editForm.price, takeawayPrice: editForm.takeawayPrice, priceHistory: newHistory };
            return { ...p, variants: newVariants };
          }
        }
        return p;
      }));
      await LoggerService.audit('UPDATE', 'INVENTORY', `Producto actualizado: ${editForm.name}`);
      setEditingRowId(null);
    }
  };

  const cancelEditing = () => {
    setEditingRowId(null);
  };

  const toggleExpand = (productId: string) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const uniqueCategories = Array.from(new Set(products.map(p => p.category)));

  const filteredProducts = products.filter(p => {
    const isLowStock = p.stock < lowStockThreshold;
    const matchCategory = categoryFilter === 'Todas las Categorías' || p.category === categoryFilter;
    const matchStock = stockStatusFilter === 'Todos los Estados' 
                       || (stockStatusFilter === 'Stock Bajo' && isLowStock)
                       || (stockStatusFilter === 'En Stock' && !isLowStock);
    
    const searchLower = searchTerm.toLowerCase();
    const barcodeMatch = (p.barcode || '').includes(searchTerm);
    const nameMatch = p.name.toLowerCase().includes(searchLower);
    const skuMatch = p.sku.toLowerCase().includes(searchLower);
    const variantsMatch = p.variants?.some(v => 
      v.name.toLowerCase().includes(searchLower) || 
      v.sku.toLowerCase().includes(searchLower) ||
      (v.barcode || '').includes(searchTerm)
    );

    return matchCategory && matchStock && (searchTerm === '' || nameMatch || skuMatch || barcodeMatch || variantsMatch);
  });

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { id: Date.now().toString(), name: '', quantity: 1, unit: 'g' }]);
  };

  const handleRemoveIngredient = (id: string) => {
    setIngredients(ingredients.filter(i => i.id !== id));
  };

  const handleAddCategoryFilter = () => {
    const trimmed = newCategoryInput.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
      setCategoryFilter(trimmed);
      setNewCategoryInput('');
    }
  };

  const handleDeleteCategory = () => {
    if (categoryFilter !== 'Todas las Categorías') {
      setCategories(categories.filter(c => c !== categoryFilter));
      setCategoryFilter('Todas las Categorías');
    }
  };

  const handleCreateProduct = async () => {
    const id = Date.now().toString();
    const newProduct = {
      id,
      name: newProductName,
      category: newProductCategory,
      sku: newProductSKU,
      barcode: newProductBarcode,
      price: Number(newProductPrice) || 0,
      takeawayPrice: Number(newProductTakeawayPrice) || 0,
      stock: newProductStock,
      unit: newProductUnit,
      variants: hasVariants ? newProductVariants : [],
      priceHistory: []
    };
    
    await setProducts([...products, newProduct]);
    await LoggerService.audit('CREATE', 'INVENTORY', `Nuevo producto creado: ${newProductName}`);
    
    // Reset state
    setNewProductName('');
    setNewProductSKU('');
    setNewProductBarcode('');
    setNewProductPrice('');
    setNewProductTakeawayPrice('');
    setNewProductStock(0);
    setIngredients([]);
    setNewProductVariants([]);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="p-container-padding space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-h1 text-h1 text-on-surface mb-1">Gestión de Inventario</h1>
          <p className="font-body-md text-on-surface-variant">
            Seguimiento de stock en tiempo real y controles de reposición.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-outline rounded-lg font-label-caps text-label-caps text-on-surface hover:bg-surface-container transition-all">
            <Upload className="h-4 w-4" />
            Importar CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-outline rounded-lg font-label-caps text-label-caps text-on-surface hover:bg-surface-container transition-all">
            <Download className="h-4 w-4" />
            Exportar Reporte
          </button>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-caps text-label-caps shadow-sm hover:opacity-90 active:scale-95 transition-all"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Añadir Nuevo Producto
          </button>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-card-gap">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary-fixed rounded-lg text-on-primary-fixed-variant">
              <Package className="h-5 w-5" />
            </div>
            <span className="text-slate-400 font-bold text-xs">Total</span>
          </div>
          <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">TOTAL SKU</p>
          <h3 className="font-h2 text-h2 text-on-surface">{products.length}</h3>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-error-container rounded-lg text-error">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <span className="text-error font-bold text-xs">{products.filter(p => p.stock < lowStockThreshold).length} Artículos</span>
          </div>
          <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">STOCK BAJO</p>
          <h3 className="font-h2 text-h2 text-on-surface">{products.filter(p => p.stock < lowStockThreshold).length}</h3>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-secondary-fixed rounded-lg text-on-secondary-fixed-variant">
              <Receipt className="h-5 w-5" />
            </div>
            <span className="text-slate-500 font-bold text-xs">A la Venta</span>
          </div>
          <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">VALOR DE STOCK</p>
          <h3 className="font-h2 text-h2 text-on-surface">${products.reduce((acc, p) => acc + (p.price * p.stock), 0).toLocaleString()}</h3>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-tertiary-fixed rounded-lg text-on-tertiary-fixed-variant">
              <Truck className="h-5 w-5" />
            </div>
            <span className="text-slate-500 font-bold text-xs">Proveedores</span>
          </div>
          <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">PEDIDOS ACTIVOS</p>
          <h3 className="font-h2 text-h2 text-on-surface">0</h3>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-surface-container-lowest rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              id="global-scanner-focus"
              type="text" 
              placeholder="Buscar por nombre, SKU o escaneo de código... (F2)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface shadow-sm transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-label-caps text-on-surface-variant">CATEGORÍA:</span>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-outline-variant rounded-md text-body-md px-3 py-1.5 focus:ring-teal-500 outline-none text-on-surface"
            >
              <option>Todas las Categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {categoryFilter !== 'Todas las Categorías' && (
              <button 
                onClick={handleDeleteCategory}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Eliminar categoría"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2 ml-2 pl-4 border-l border-slate-200">
              <input 
                type="text" 
                placeholder="Nueva categoría..."
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCategoryFilter();
                }}
                className="bg-white border border-outline-variant rounded-md text-body-md px-3 py-1.5 focus:ring-teal-500 outline-none text-on-surface w-40"
              />
              <button 
                onClick={handleAddCategoryFilter}
                disabled={!newCategoryInput.trim()}
                className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-md font-bold text-sm transition-colors disabled:opacity-50"
              >
                Añadir
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="font-label-caps text-label-caps text-on-surface-variant">ESTADO:</span>
            <select 
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="bg-white border border-outline-variant rounded-md text-body-md px-3 py-1.5 focus:ring-teal-500 outline-none text-on-surface"
            >
              <option>Todos los Estados</option>
              <option>En Stock</option>
              <option>Stock Bajo</option>
            </select>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="font-label-caps text-label-caps text-on-surface-variant">ALERTA BAJO STOCK:</span>
            <input 
              type="number" 
              min="0" 
              value={lowStockThreshold} 
              onChange={(e) => setLowStockThreshold(Number(e.target.value))}
              className="bg-white border border-outline-variant rounded-md text-body-md w-20 px-3 py-1.5 focus:ring-teal-500 outline-none text-on-surface"
            />
          </div>
          <div className="ml-auto">
            <span className="text-body-md text-on-surface-variant">
              Mostrando <b>{filteredProducts.length}</b> de {products.length} resultados
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant">NOMBRE DEL PRODUCTO</th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant">CATEGORÍA</th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant text-right">STOCK ACTUAL</th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant text-right">PRECIOS (LOCAL / LLEVAR)</th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant text-center">ESTADO</th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">
                    No se encontraron productos que coincidan con los filtros.
                  </td>
                </tr>
              ) : filteredProducts.map((product) => {
                const isLowStock = product.stock < lowStockThreshold;
                const isEditing = editingRowId === product.id;
                const hasVariants = product.variants && product.variants.length > 0;
                const isExpanded = expandedProducts[product.id];

                return (
                  <Fragment key={product.id}>
                    <tr 
                      className={cn(
                        "transition-colors",
                        isLowStock && !isEditing ? "bg-red-50/50 hover:bg-red-50 border-l-4 border-l-error" : "hover:bg-slate-50 border-l-4 border-l-transparent",
                        isEditing ? "bg-indigo-50/30" : ""
                      )}
                    >
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                           {hasVariants ? (
                             <button 
                               onClick={() => toggleExpand(product.id)}
                               className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors"
                             >
                               {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                             </button>
                           ) : (
                             <div className="w-6"></div>
                           )}
                           <div className={cn("w-10 h-10 rounded flex items-center justify-center shrink-0", isLowStock && !isEditing ? "bg-red-100 text-error" : "bg-slate-100 text-slate-400")}>
                             {hasVariants ? <Layers className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                           </div>
                           <div className="flex-1">
                             {isEditing ? (
                               <div className="space-y-1">
                                 <input 
                                   type="text" 
                                   value={editForm.name} 
                                   onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                   className="w-full bg-white border border-indigo-300 text-slate-800 px-2 py-1 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" 
                                 />
                                 <div className="flex gap-1">
                                   <input 
                                     type="text" 
                                     value={editForm.sku} 
                                     onChange={(e) => setEditForm(prev => ({ ...prev, sku: e.target.value }))}
                                     placeholder="SKU"
                                     className="w-1/2 bg-white border border-indigo-300 text-slate-500 px-2 py-1 rounded text-[10px] focus:ring-2 focus:ring-indigo-500 outline-none" 
                                   />
                                   <input 
                                     type="text" 
                                     value={editForm.barcode} 
                                     onChange={(e) => setEditForm(prev => ({ ...prev, barcode: e.target.value }))}
                                     placeholder="Código Barra"
                                     className="w-1/2 bg-white border border-indigo-300 text-indigo-600 px-2 py-1 rounded text-[10px] focus:ring-2 focus:ring-indigo-500 outline-none font-bold" 
                                   />
                                 </div>
                               </div>
                             ) : (
                               <>
                                 <p className={cn("font-body-md font-bold", isLowStock && !isEditing ? "text-error" : "text-on-surface")}>{product.name}</p>
                                 <div className="flex items-center gap-2 mt-0.5">
                                   <p className="text-[10px] text-on-surface-variant font-medium bg-slate-100 px-1.5 py-0.5 rounded uppercase">SKU: {product.sku}</p>
                                   {product.barcode && (
                                     <p className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                                       <Receipt className="w-3 h-3" /> {product.barcode}
                                     </p>
                                   )}
                                 </div>
                               </>
                             )}
                           </div>
                         </div>
                      </td>
                      <td className="px-6 py-4 font-body-md text-on-surface-variant">{product.category}</td>
                      <td className={cn("px-6 py-4 font-body-md text-right", isLowStock && !isEditing ? "text-error font-bold" : "text-on-surface font-medium")}>
                        {product.stock} {product.unit}
                      </td>
                      <td className="px-6 py-4 font-body-md text-right whitespace-nowrap">
                        {isEditing && !hasVariants ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="relative w-20">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">$</span>
                              <input 
                                type="number" 
                                value={editForm.price} 
                                onChange={(e) => setEditForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                                className="w-full bg-white border border-indigo-300 text-slate-800 pl-5 pr-2 py-1 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                              />
                            </div>
                            <span className="text-slate-400">/</span>
                            <div className="relative w-20">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">$</span>
                              <input 
                                type="number" 
                                value={editForm.takeawayPrice}
                                onChange={(e) => setEditForm(prev => ({ ...prev, takeawayPrice: Number(e.target.value) }))}
                                className="w-full bg-white border border-indigo-300 text-indigo-700 pl-5 pr-2 py-1 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                              />
                            </div>
                          </div>
                        ) : hasVariants ? (
                          <span className="text-slate-500 italic text-sm">{product.variants?.length} Variantes</span>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-on-surface">${product.price?.toFixed(2)}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-indigo-600 font-medium">${product.takeawayPrice?.toFixed(2)}</span>
                            <button onClick={() => setHistoryModalItem(product)} className="text-slate-400 hover:text-indigo-600 transition-colors ml-1 p-0.5 rounded-md hover:bg-indigo-50" title="Ver Historial de Precios">
                              <History className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isLowStock ? (
                          <span className="px-3 py-1 bg-red-100 text-red-700 font-status-badge text-status-badge rounded-full">Stock Bajo</span>
                        ) : (
                          <span className="px-3 py-1 bg-green-100 text-green-700 font-status-badge text-status-badge rounded-full">En Stock</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-end">
                            <button onClick={saveEditing} className="text-indigo-600 hover:text-indigo-800 transition-colors p-1" title="Guardar">
                              <Save className="w-5 h-5" />
                            </button>
                            <button onClick={cancelEditing} className="text-slate-400 hover:text-slate-600 transition-colors p-1 ml-1" title="Cancelar">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                            <div className="flex items-center justify-end">
                              <button onClick={() => startEditing(product)} className="text-slate-400 hover:text-primary transition-colors p-1">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button className="text-slate-400 hover:text-error transition-colors p-1 ml-1">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                        )}
                      </td>
                    </tr>
                    
                    {/* Render Variants if expanded */}
                    {hasVariants && isExpanded && product.variants?.map(variant => {
                      const isVarLowStock = variant.stock < lowStockThreshold;
                      const isVarEditing = editingRowId === variant.id;
                      
                      return (
                        <tr 
                          key={variant.id}
                          className={cn(
                            "bg-slate-50/50 border-b border-dashed border-slate-200 transition-colors",
                            isVarLowStock && !isVarEditing ? "bg-red-50/30 border-l-4 border-l-error" : "border-l-4 border-l-transparent",
                            isVarEditing ? "bg-indigo-50/30" : ""
                          )}
                        >
                             <td className="px-6 py-3 pl-16">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                  <div className="flex-1">
                                    {isVarEditing ? (
                                      <div className="space-y-1">
                                        <input 
                                          type="text" 
                                          value={editForm.name} 
                                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                          className="w-full bg-white border border-indigo-300 text-slate-800 px-2 py-1 rounded text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold" 
                                        />
                                        <div className="flex gap-1">
                                          <input 
                                            type="text" 
                                            value={editForm.sku} 
                                            onChange={(e) => setEditForm(prev => ({ ...prev, sku: e.target.value }))}
                                            placeholder="SKU"
                                            className="w-1/2 bg-white border border-indigo-300 text-slate-500 px-2 py-1 rounded text-[9px] focus:ring-2 focus:ring-indigo-500 outline-none" 
                                          />
                                          <input 
                                            type="text" 
                                            value={editForm.barcode} 
                                            onChange={(e) => setEditForm(prev => ({ ...prev, barcode: e.target.value }))}
                                            placeholder="Barcode"
                                            className="w-1/2 bg-white border border-indigo-300 text-indigo-600 px-2 py-1 rounded text-[9px] focus:ring-2 focus:ring-indigo-500 outline-none font-bold" 
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <p className={cn("text-sm font-bold", isVarLowStock && !isVarEditing ? "text-error" : "text-on-surface")}>{variant.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <p className="text-[9px] text-on-surface-variant font-medium bg-white px-1.5 py-0.5 rounded border border-slate-200 uppercase">SKU: {variant.sku}</p>
                                          {variant.barcode && (
                                            <p className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                                              <Receipt className="w-2.5 h-2.5" /> {variant.barcode}
                                            </p>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                             </td>
                          <td className="px-6 py-3 font-body-md text-slate-400 text-sm">--</td>
                          <td className={cn("px-6 py-3 font-body-md text-right text-sm", isVarLowStock && !isVarEditing ? "text-error font-bold" : "text-on-surface font-medium")}>
                            {variant.stock} {variant.unit || product.unit}
                          </td>
                          <td className="px-6 py-3 font-body-md text-right whitespace-nowrap text-sm">
                            {isVarEditing ? (
                              <div className="flex items-center justify-end gap-2">
                                <div className="relative w-20">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">$</span>
                                  <input 
                                    type="number" 
                                    value={editForm.price} 
                                    onChange={(e) => setEditForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                                    className="w-full bg-white border border-indigo-300 text-slate-800 pl-5 pr-2 py-1 rounded text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                                  />
                                </div>
                                <span className="text-slate-400">/</span>
                                <div className="relative w-20">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">$</span>
                                  <input 
                                    type="number" 
                                    value={editForm.takeawayPrice}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, takeawayPrice: Number(e.target.value) }))}
                                    className="w-full bg-white border border-indigo-300 text-indigo-700 pl-5 pr-2 py-1 rounded text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-on-surface">${variant.price?.toFixed(2)}</span>
                                <span className="text-slate-400 mx-1">/</span>
                                <span className="text-indigo-600 font-medium">${variant.takeawayPrice?.toFixed(2)}</span>
                                <button onClick={() => setHistoryModalItem(variant)} className="text-slate-400 hover:text-indigo-600 transition-colors ml-1 p-0.5 rounded-md hover:bg-indigo-50" title="Ver Historial de Precios">
                                  <History className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {isVarLowStock ? (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 font-status-badge text-[10px] rounded-full">Stock Bajo</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 font-status-badge text-[10px] rounded-full">En Stock</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right whitespace-nowrap">
                            {isVarEditing ? (
                              <div className="flex items-center justify-end">
                                <button onClick={saveEditing} className="text-indigo-600 hover:text-indigo-800 transition-colors p-1" title="Guardar">
                                  <Save className="w-4 h-4" />
                                </button>
                                <button onClick={cancelEditing} className="text-slate-400 hover:text-slate-600 transition-colors p-1 ml-1" title="Cancelar">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end">
                                <button onClick={() => startEditing(variant)} className="text-slate-400 hover:text-primary transition-colors p-1">
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button className="text-slate-400 hover:text-error transition-colors p-1 ml-1">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Product Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden border border-slate-200" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h2 className="font-bold text-xl text-slate-800">Nuevo Producto / Receta</h2>
                <p className="text-sm text-slate-500 font-medium">Define el producto y sus insumos descontables del inventario.</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
              {/* Left Column: Basic Info */}
              <div className="lg:w-1/2 p-6 border-r border-slate-100 space-y-6">
                
                {/* Image Upload Area */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Imagen del Producto</label>
                  <div className="w-full h-40 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-6 h-6 text-indigo-400" />
                    </div>
                    <span className="text-sm font-semibold text-slate-600">Subir Imagen</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">PNG, JPG hasta 5MB</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Hamburguesa Doble" 
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</label>
                        <button 
                          type="button"
                          onClick={() => setIsAddingCategory(!isAddingCategory)}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          {isAddingCategory ? 'Cancelar' : '+ Nueva'}
                        </button>
                      </div>
                      
                      {isAddingCategory ? (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Nombre de categoría" 
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newCategoryName.trim()) {
                                e.preventDefault();
                                setCategories([...categories, newCategoryName.trim()]);
                                setNewCategoryName('');
                                setIsAddingCategory(false);
                                setNewProductCategory(newCategoryName.trim());
                              }
                            }}
                          />
                          <button 
                            type="button"
                            className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold"
                            onClick={() => {
                              if (newCategoryName.trim()) {
                                setCategories([...categories, newCategoryName.trim()]);
                                setNewCategoryName('');
                                setIsAddingCategory(false);
                                setNewProductCategory(newCategoryName.trim());
                              }
                            }}
                          >
                            Añadir
                          </button>
                        </div>
                      ) : (
                        <select 
                          value={newProductCategory}
                          onChange={(e) => setNewProductCategory(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium appearance-none"
                        >
                          {categories.map((cat, idx) => (
                            <option key={idx} value={cat}>{cat}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Código (SKU)</label>
                        <input 
                          type="text" 
                          placeholder="BUR-DOB-01" 
                          value={newProductSKU}
                          onChange={(e) => setNewProductSKU(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                          disabled={hasVariants} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                          Código de Barras
                          <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1 py-0.5 rounded">EAN/UPC</span>
                        </label>
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="712345678901..." 
                            value={newProductBarcode}
                            onChange={(e) => setNewProductBarcode(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                            disabled={hasVariants} 
                          />
                          <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600" title="Escanear Producto">
                            <Search className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 mb-2">
                    <input 
                      type="checkbox" 
                      id="hasVariants" 
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" 
                      checked={hasVariants}
                      onChange={(e) => setHasVariants(e.target.checked)}
                    />
                    <label htmlFor="hasVariants" className="text-sm font-semibold text-slate-700">Este producto tiene variantes (ej. tamaños, sabores)</label>
                  </div>

                  {hasVariants ? (
                    <div className="space-y-4 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-bold text-slate-800">Variantes</h4>
                        <button 
                          type="button"
                          onClick={() => setNewProductVariants([...newProductVariants, { id: Date.now().toString(), name: '', sku: '', price: 0, takeawayPrice: 0 }])}
                          className="flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Añadir Variante
                        </button>
                      </div>
                      
                      {newProductVariants.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4">Añade variantes como "Pequeño", "Mediano", "Sabor Chocolate", etc.</p>
                      ) : (
                        <div className="space-y-3">
                          {newProductVariants.map((variant, index) => (
                            <div key={variant.id} className="flex gap-2 items-start bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
                              <div className="grid grid-cols-2 gap-2 flex-1">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre Variante</label>
                                  <input 
                                    type="text" 
                                    placeholder="Ej. Pequeño" 
                                    value={variant.name}
                                    onChange={(e) => {
                                      const nv = [...newProductVariants]; nv[index].name = e.target.value; setNewProductVariants(nv);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 rounded text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SKU</label>
                                  <input 
                                    type="text" 
                                    placeholder="Ej. BUR-DOB-PEQ" 
                                    value={variant.sku}
                                    onChange={(e) => {
                                      const nv = [...newProductVariants]; nv[index].sku = e.target.value; setNewProductVariants(nv);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 rounded text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Precio</label>
                                  <input 
                                    type="number" 
                                    placeholder="0.00" 
                                    value={variant.price || ''}
                                    onChange={(e) => {
                                      const nv = [...newProductVariants]; nv[index].price = Number(e.target.value); setNewProductVariants(nv);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 rounded text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 truncate">Precio P/Llevar</label>
                                  <input 
                                    type="number" 
                                    placeholder="0.00" 
                                    value={variant.takeawayPrice || ''}
                                    onChange={(e) => {
                                      const nv = [...newProductVariants]; nv[index].takeawayPrice = Number(e.target.value); setNewProductVariants(nv);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 rounded text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                                  />
                                </div>
                              </div>
                              <button 
                                onClick={() => setNewProductVariants(newProductVariants.filter(v => v.id !== variant.id))}
                                className="mt-5 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Precio Local</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                          <input type="number" placeholder="0.00" className="w-full bg-slate-50 border border-slate-200 text-slate-800 pl-6 pr-2 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 truncate" title="Precio Para Llevar">Precio P/Llevar</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                          <input type="number" placeholder="0.00" className="w-full bg-slate-50 border border-slate-200 text-slate-800 pl-6 pr-2 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Costo Estimado</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                          <input type="number" placeholder="0.00" className="w-full bg-slate-200 border border-slate-200 text-slate-500 pl-6 pr-2 py-2.5 rounded-lg text-sm outline-none font-medium" readOnly />
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Right Column: Ingredients/Recipe */}
              <div className="lg:w-1/2 p-6 flex flex-col bg-slate-50/50">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Insumos (Receta)</h3>
                    <p className="text-xs text-slate-500 font-medium">Elementos a descontar del stock por cada venta.</p>
                  </div>
                  <button 
                    onClick={handleAddIngredient}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                  {ingredients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-white border border-slate-200 border-dashed rounded-xl h-40">
                      <Package className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-500">Sin insumos configurados.</p>
                      <p className="text-xs text-slate-400 mt-1">Este producto no descontará nada del inventario por defecto, a menos que agregues insumos.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ingredients.map((ing) => (
                        <div key={ing.id} className="flex gap-2 items-start bg-white p-3 border border-slate-200 rounded-xl shadow-sm">
                          <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input 
                              type="text" 
                              placeholder="Buscar en inventario..." 
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                            />
                          </div>
                          <div className="w-24">
                            <input 
                              type="number" 
                              placeholder="0" 
                              value={ing.quantity}
                              onChange={(e) => setIngredients(ingredients.map(i => i.id === ing.id ? {...i, quantity: Number(e.target.value)} : i))}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-indigo-500 outline-none font-bold" 
                            />
                          </div>
                          <div className="w-24">
                            <select 
                              value={ing.unit}
                              onChange={(e) => setIngredients(ingredients.map(i => i.id === ing.id ? {...i, unit: e.target.value} : i))}
                              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium appearance-none"
                            >
                              <option value="g">Gramos</option>
                              <option value="kg">Kg</option>
                              <option value="ml">ml</option>
                              <option value="l">Litro</option>
                              <option value="u">Unidad</option>
                            </select>
                          </div>
                          <button 
                            onClick={() => handleRemoveIngredient(ing.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Totals */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-500 uppercase tracking-wider">Costo Receta Calculado:</span>
                    <span className="font-bold text-slate-800 text-lg">$0.00</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                onClick={handleCreateProduct}
                disabled={!newProductName}
              >
                <Save className="w-4 h-4" />
                Guardar Producto
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="font-bold text-lg text-slate-800">Historial de Precios</h2>
                <p className="text-sm text-slate-500 font-medium">{historyModalItem.name}</p>
              </div>
              <button 
                onClick={() => setHistoryModalItem(null)}
                className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {(!historyModalItem.priceHistory || historyModalItem.priceHistory.length === 0) ? (
                <div className="text-center py-8 text-slate-500">
                  <History className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No hay historial de cambios para este producto.</p>
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {historyModalItem.priceHistory.map((entry: any, idx: number) => (
                    <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-indigo-500 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" />
                      <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 border border-slate-100 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-slate-400">
                            {new Date(entry.date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                          <div className="text-sm">
                            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded mb-1 border border-slate-100">
                              <span className="text-slate-500 text-xs font-bold uppercase">Mesa</span>
                              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                <span className="line-through text-slate-400 opacity-70">${entry.oldPrice?.toFixed(2)}</span>
                                <span>→</span>
                                <span className="text-green-600">${entry.newPrice?.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                              <span className="text-slate-500 text-xs font-bold uppercase">Llevar</span>
                              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                <span className="line-through text-slate-400 opacity-70">${entry.oldTakeaway?.toFixed(2)}</span>
                                <span>→</span>
                                <span className="text-green-600">${entry.newTakeaway?.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setHistoryModalItem(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
