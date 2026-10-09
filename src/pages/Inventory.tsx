import { useState, useEffect, Fragment } from "react";
import { isLowStock, isLowStock as isLowStockFn, readLowStockThreshold, saveLowStockThreshold } from '../lib/stock';
import { PurchaseListModal } from '../components/PurchaseListModal';
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
import { formatMoney } from "../lib/format";
import { Card } from "../components/ui/Card";
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
  const { products, addProduct, updateProduct } = useStore();
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [ingredients, setIngredients] = useState<{id: string, ingredientId?: number, name: string, quantity: number, unit: string}[]>([]);
  const [hasVariants, setHasVariants] = useState(false);
  const [newProductVariants, setNewProductVariants] = useState<{id: string, name: string, sku: string, price: number, takeawayPrice: number, stock: number}[]>([]);
  // Umbral general (para productos sin stock mínimo propio); se guarda en este dispositivo
  const [lowStockThreshold, setLowStockThresholdState] = useState(() => readLowStockThreshold());
  const setLowStockThreshold = (n: number) => { setLowStockThresholdState(n); saveLowStockThreshold(n); };
  const [isPurchaseListOpen, setIsPurchaseListOpen] = useState(false);
  const [newProductMinStock, setNewProductMinStock] = useState<number | ''>('');
  const { setLowStockCount } = useAlerts();

  // New Product Modal State
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState(INITIAL_CATEGORIES[0]);
  const [newProductSKU, setNewProductSKU] = useState('');
  const [newProductBarcode, setNewProductBarcode] = useState('');
  const [newProductPrice, setNewProductPrice] = useState<number | ''>('');
  const [newProductTakeawayPrice, setNewProductTakeawayPrice] = useState<number | ''>('');
  const [newProductCost, setNewProductCost] = useState<number | ''>('');
  const [newProductStock, setNewProductStock] = useState(0);
  const [newProductUnit, setNewProductUnit] = useState('Unidades');
  const [newProductIsMenuAvailable, setNewProductIsMenuAvailable] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState('Todas las Categorías');
  const [stockStatusFilter, setStockStatusFilter] = useState('Todos los Estados');

  const [editingRowId, setEditingRowId] = useState<number | string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; sku: string; barcode: string; price: number; takeawayPrice: number; stock: number; unit: string; cost: number; status: string; minStock: number | '' }>({ name: '', sku: '', barcode: '', price: 0, takeawayPrice: 0, stock: 0, unit: 'Unidades', cost: 0, status: 'active', minStock: '' });
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({'2': true});
  const [historyModalItem, setHistoryModalItem] = useState<any>(null);

  // Auto-calculated recipe cost based on database product cost
  const recipeCost = ingredients.reduce((acc, ing) => {
    const dbProd = products.find(p => p.id === ing.ingredientId || p.name === ing.name);
    const unitCost = dbProd?.cost || 0;
    return acc + (ing.quantity * unitCost);
  }, 0);

  useEffect(() => {
    const count = products.filter(p => isLowStock(p, lowStockThreshold)).length;
    setLowStockCount(count);
  }, [products, lowStockThreshold, setLowStockCount]);

  const startEditing = (product: any) => {
    setEditingRowId(product.id);
    setEditForm({ 
      name: product.name || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      price: product.price || 0, 
      takeawayPrice: product.takeawayPrice || 0,
      stock: product.stock || 0,
      unit: product.unit || 'Unidades',
      cost: product.cost || 0,
      status: product.status || 'active',
      minStock: product.minStock ?? ''
    });
  };

  const saveEditing = async () => {
    if (editingRowId) {
      const parentProduct = products.find(p => p.id === editingRowId);
      if (parentProduct) {
        const historyEntry = (parentProduct.price !== editForm.price || parentProduct.takeawayPrice !== editForm.takeawayPrice) 
          ? { date: new Date().toISOString(), oldPrice: parentProduct.price, newPrice: editForm.price, oldTakeaway: parentProduct.takeawayPrice, newTakeaway: editForm.takeawayPrice }
          : null;
        const newHistory = historyEntry ? [historyEntry, ...(parentProduct.priceHistory || [])] : (parentProduct.priceHistory || []);
        
        await updateProduct(editingRowId as number, {
          name: editForm.name,
          sku: editForm.sku,
          barcode: editForm.barcode,
          price: editForm.price,
          takeawayPrice: editForm.takeawayPrice,
          stock: editForm.stock,
          unit: editForm.unit,
          cost: editForm.cost,
          status: editForm.status,
          minStock: editForm.minStock === '' ? undefined : Number(editForm.minStock),
          priceHistory: newHistory
        });
      } else {
        const productWithVariant = products.find(p => p.variants?.some(v => v.id === editingRowId));
        if (productWithVariant) {
          const updatedVariants = productWithVariant.variants?.map(v => {
            if (v.id === editingRowId) {
              return {
                ...v,
                name: editForm.name,
                sku: editForm.sku,
                barcode: editForm.barcode,
                price: editForm.price,
                takeawayPrice: editForm.takeawayPrice,
                stock: editForm.stock,
                unit: editForm.unit,
                cost: editForm.cost,
                status: editForm.status
              };
            }
            return v;
          }) || [];
          
          await updateProduct(productWithVariant.id!, {
            variants: updatedVariants
          });
        }
      }
      await LoggerService.audit('UPDATE', 'INVENTORY', `Producto/Variante actualizado: ${editForm.name}`);
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
    const isLowStock = isLowStockFn(p, lowStockThreshold);
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
    const newProduct = {
      name: newProductName,
      category: newProductCategory,
      sku: newProductSKU,
      barcode: newProductBarcode,
      price: Number(newProductPrice) || 0,
      takeawayPrice: Number(newProductTakeawayPrice) || 0,
      cost: ingredients.length > 0 ? recipeCost : (Number(newProductCost) || 0),
      stock: newProductStock,
      minStock: newProductMinStock === '' ? undefined : Number(newProductMinStock),
      unit: newProductUnit,
      status: newProductIsMenuAvailable ? 'active' : 'inactive',
      recipe: ingredients.length > 0 ? ingredients.map(ing => ({
        ingredientId: ing.ingredientId || 0,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit
      })) : [],
      variants: hasVariants ? newProductVariants : [],
      priceHistory: []
    };
    
    await addProduct(newProduct);
    await LoggerService.audit('CREATE', 'INVENTORY', `Nuevo producto creado: ${newProductName}`);
    
    // Reset state
    setNewProductName('');
    setNewProductSKU('');
    setNewProductBarcode('');
    setNewProductPrice('');
    setNewProductTakeawayPrice('');
    setNewProductCost('');
    setNewProductStock(0);
    setIngredients([]);
    setNewProductVariants([]);
    setIsCreateModalOpen(false);
    setNewProductIsMenuAvailable(true);
  };

  return (
    <div className="p-container-padding space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="font-h1 text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-zinc-100 mb-1">Gestión de Inventario</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium dark:text-zinc-400">
            Seguimiento de stock en tiempo real y controles de reposición.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg font-label-caps text-[10px] sm:text-xs font-bold text-slate-700 dark:text-zinc-200 bg-white dark:bg-[#1E342B] hover:bg-slate-50 dark:hover:bg-[#243E33] transition-all">
            <Upload className="h-4 w-4" />
            Importar CSV
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg font-label-caps text-[10px] sm:text-xs font-bold text-slate-700 dark:text-zinc-200 bg-white dark:bg-[#1E342B] hover:bg-slate-50 dark:hover:bg-[#243E33] transition-all">
            <Download className="h-4 w-4" />
            Exportar Reporte
          </button>
          <button 
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-on-primary rounded-lg font-label-caps text-[10px] sm:text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Añadir Nuevo Producto
          </button>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-card-gap">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-[#0F6B41]/10 dark:bg-white/10 rounded-lg text-[#0F6B41] dark:text-emerald-400">
              <Package className="h-5 w-5" />
            </div>
            <span className="text-slate-500 dark:text-zinc-400 font-bold text-xs">Total</span>
          </div>
          <p className="font-label-caps text-label-caps text-slate-500 dark:text-zinc-400 mb-1">TOTAL SKU</p>
          <h3 className="font-h2 text-h2 text-slate-900 dark:text-zinc-100">{products.length}</h3>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-lg text-[#C62828] dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <span className="text-[#C62828] dark:text-rose-400 font-bold text-xs">{products.filter(p => isLowStock(p, lowStockThreshold)).length} Artículos</span>
          </div>
          <p className="font-label-caps text-label-caps text-slate-500 dark:text-zinc-400 mb-1">STOCK BAJO</p>
          <h3 className="font-h2 text-h2 text-slate-900 dark:text-zinc-100">{products.filter(p => isLowStock(p, lowStockThreshold)).length}</h3>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 dark:bg-white/10 rounded-lg text-[#0F6B41] dark:text-emerald-400">
              <Receipt className="h-5 w-5" />
            </div>
            <span className="text-slate-500 dark:text-zinc-400 font-bold text-xs">A la Venta</span>
          </div>
          <p className="font-label-caps text-label-caps text-slate-500 dark:text-zinc-400 mb-1">VALOR DE STOCK</p>
          <h3 className="font-h2 text-h2 text-slate-900 dark:text-zinc-100">{formatMoney(products.reduce((acc, p) => acc + (p.price * p.stock), 0))}</h3>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 dark:bg-white/10 rounded-lg text-amber-700 dark:text-amber-400">
              <Truck className="h-5 w-5" />
            </div>
            <span className="text-slate-500 dark:text-zinc-400 font-bold text-xs">Proveedores</span>
          </div>
          <p className="font-label-caps text-label-caps text-slate-500 dark:text-zinc-400 mb-1">PEDIDOS ACTIVOS</p>
          <h3 className="font-h2 text-h2 text-slate-900 dark:text-zinc-100">0</h3>
        </Card>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-[#182C24] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#14261F] flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-400" />
            <input 
              id="global-scanner-focus"
              type="text" 
              placeholder="Buscar por nombre, SKU o escaneo de código... (F2)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#1E342B] border border-slate-200 dark:border-slate-700 rounded-lg text-body-md focus:ring-2 focus:ring-[#0F6B41]/20 focus:border-[#0F6B41] outline-none text-slate-900 dark:text-zinc-100 shadow-sm transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-label-caps text-slate-500 dark:text-zinc-400">CATEGORÍA:</span>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white dark:bg-[#1E342B] border border-slate-200 dark:border-slate-700 rounded-md text-body-md px-3 py-1.5 focus:ring-[#0F6B41] outline-none text-slate-900 dark:text-zinc-100"
            >
              <option>Todas las Categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {categoryFilter !== 'Todas las Categorías' && (
              <button 
                onClick={handleDeleteCategory}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors dark:text-zinc-400"
                title="Eliminar categoría"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2 ml-2 pl-4 border-l border-slate-200 dark:border-white/10">
              <input 
                type="text" 
                placeholder="Nueva categoría..."
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCategoryFilter();
                }}
                className="bg-white dark:bg-[#1E342B] border border-slate-200 dark:border-slate-700 rounded-md text-body-md px-3 py-1.5 focus:ring-[#0F6B41] outline-none text-slate-900 dark:text-zinc-100 w-40"
              />
              <button 
                onClick={handleAddCategoryFilter}
                disabled={!newCategoryInput.trim()}
                className="bg-emerald-50 text-[#0F6B41] hover:bg-emerald-100 px-3 py-1.5 rounded-md font-bold text-sm transition-colors disabled:opacity-50 dark:text-emerald-400"
              >
                Añadir
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="font-label-caps text-label-caps text-slate-500 dark:text-zinc-400">ESTADO:</span>
            <select 
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="bg-white dark:bg-[#1E342B] border border-slate-200 dark:border-slate-700 rounded-md text-body-md px-3 py-1.5 focus:ring-[#0F6B41] outline-none text-slate-900 dark:text-zinc-100"
            >
              <option>Todos los Estados</option>
              <option>En Stock</option>
              <option>Stock Bajo</option>
            </select>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="font-label-caps text-label-caps text-slate-500 dark:text-zinc-400">ALERTA BAJO STOCK:</span>
            <input 
              type="number" 
              min="0" 
              value={lowStockThreshold} 
              onChange={(e) => setLowStockThreshold(Number(e.target.value))}
              className="bg-white dark:bg-[#1E342B] border border-slate-200 dark:border-slate-700 rounded-md text-body-md w-20 px-3 py-1.5 focus:ring-[#0F6B41] outline-none text-slate-900 dark:text-zinc-100"
            />
            <button
              onClick={() => setIsPurchaseListOpen(true)}
              className="ml-2 px-3 py-1.5 rounded-md bg-[#0F6B41] text-white text-xs font-bold whitespace-nowrap"
            >
              Lista de compra
            </button>
          </div>
          <div className="ml-auto">
            <span className="text-body-md text-slate-500 dark:text-zinc-400">
              Mostrando <b>{filteredProducts.length}</b> de {products.length} resultados
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#14261F] border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500 dark:text-zinc-400">NOMBRE DEL PRODUCTO</th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500 dark:text-zinc-400">CATEGORÍA</th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500 dark:text-zinc-400 text-right">STOCK ACTUAL</th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500 dark:text-zinc-400 text-right">COSTO</th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500 dark:text-zinc-400 text-right">PRECIOS (LOCAL / LLEVAR)</th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500 dark:text-zinc-400 text-center">MENÚ</th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500 dark:text-zinc-400 text-center">ESTADO</th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500 dark:text-zinc-400 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-on-surface-variant">
                    No se encontraron productos que coincidan con los filtros.
                  </td>
                </tr>
              ) : filteredProducts.map((product) => {
                const isLowStock = isLowStockFn(product, lowStockThreshold);
                const isEditing = editingRowId === product.id;
                const hasVariants = product.variants && product.variants.length > 0;
                const isExpanded = expandedProducts[product.id];

                return (
                  <Fragment key={product.id}>
                    <tr 
                      className={cn(
                        "transition-colors",
                        isLowStock && !isEditing ? "bg-red-50/50 hover:bg-red-50 dark:bg-rose-950/30 dark:hover:bg-rose-950/40 border-l-4 border-l-error" : "hover:bg-slate-50 dark:hover:bg-[#1E342B] border-l-4 border-l-transparent",
                        isEditing ? "bg-emerald-50/30" : ""
                      )}
                    >
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                           {hasVariants ? (
                             <button 
                               onClick={() => toggleExpand(product.id as any)}
                               className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors dark:text-zinc-400"
                             >
                               {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                             </button>
                           ) : (
                             <div className="w-6"></div>
                           )}
                           <div className={cn("w-10 h-10 rounded flex items-center justify-center shrink-0", isLowStock && !isEditing ? "bg-red-100 text-error dark:text-rose-300" : "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-zinc-400")}>
                             {hasVariants ? <Layers className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                           </div>
                           <div className="flex-1">
                             {isEditing ? (
                               <div className="space-y-1">
                                 <input 
                                   type="text" 
                                   value={editForm.name} 
                                   onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                   className="w-full bg-white border border-[#0F6B41]/40 text-slate-800 px-2 py-1 rounded focus:ring-2 focus:ring-[#0F6B41] outline-none font-bold text-sm dark:bg-[var(--bg-surface)] dark:text-zinc-100" 
                                 />
                                 <div className="flex gap-1">
                                   <input 
                                     type="text" 
                                     value={editForm.sku} 
                                     onChange={(e) => setEditForm(prev => ({ ...prev, sku: e.target.value }))}
                                     placeholder="SKU"
                                     className="w-1/2 bg-white border border-[#0F6B41]/40 text-slate-500 px-2 py-1 rounded text-[10px] focus:ring-2 focus:ring-[#0F6B41] outline-none dark:bg-[var(--bg-surface)] dark:text-zinc-400" 
                                   />
                                   <input 
                                     type="text" 
                                     value={editForm.barcode} 
                                     onChange={(e) => setEditForm(prev => ({ ...prev, barcode: e.target.value }))}
                                     placeholder="Código Barra"
                                     className="w-1/2 bg-white border border-[#0F6B41]/40 text-[#0F6B41] px-2 py-1 rounded text-[10px] focus:ring-2 focus:ring-[#0F6B41] outline-none font-bold dark:bg-[var(--bg-surface)] dark:text-emerald-400" 
                                   />
                                 </div>
                               </div>
                             ) : (
                               <>
                                 <p className={cn("font-body-md font-bold", isLowStock && !isEditing ? "text-error dark:text-rose-300" : "text-on-surface")}>{product.name}</p>
                                 <div className="flex items-center gap-2 mt-0.5">
                                   <p className="text-[10px] text-on-surface-variant font-medium bg-slate-100 px-1.5 py-0.5 rounded uppercase dark:bg-white/5">SKU: {product.sku}</p>
                                   {product.barcode && (
                                     <p className="text-[10px] text-[#0F6B41] font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1 dark:text-emerald-400">
                                       <Receipt className="w-3 h-3" /> {product.barcode}
                                     </p>
                                   )}
                                 </div>
                               </>
                             )}
                           </div>
                         </div>
                      </td>
                      <td className="px-6 py-4 font-body-md text-slate-600 dark:text-zinc-300">{product.category}</td>
                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <input 
                              type="number" 
                              value={editForm.stock} 
                              onChange={(e) => setEditForm(prev => ({ ...prev, stock: Number(e.target.value) }))}
                              className="w-16 bg-white border border-[#0F6B41]/40 text-slate-800 px-1.5 py-1 rounded text-sm focus:ring-2 focus:ring-[#0F6B41] outline-none text-right font-medium dark:bg-[var(--bg-surface)] dark:text-zinc-100" 
                            />
                            <input
                              type="number"
                              title="Stock mínimo (vacío = umbral general)"
                              placeholder="mín"
                              value={editForm.minStock}
                              onChange={(e) => setEditForm(prev => ({ ...prev, minStock: e.target.value === '' ? '' : Number(e.target.value) }))}
                              className="w-14 bg-amber-50 border border-amber-300 text-slate-800 px-1.5 py-1 rounded text-sm outline-none text-right font-medium dark:text-zinc-100"
                            />
                            <input 
                              type="text" 
                              value={editForm.unit} 
                              onChange={(e) => setEditForm(prev => ({ ...prev, unit: e.target.value }))}
                              className="w-16 bg-white border border-[#0F6B41]/40 text-slate-500 px-1 py-1 rounded text-xs focus:ring-2 focus:ring-[#0F6B41] outline-none dark:bg-[var(--bg-surface)] dark:text-zinc-400" 
                            />
                          </div>
                        ) : (
                          <span className={cn("font-body-md", isLowStock && !isEditing ? "text-error font-bold dark:text-rose-300" : "text-on-surface font-medium")}>
                            {product.stock} {product.unit}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                          <div className="relative w-20 ml-auto">
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs dark:text-zinc-400">$</span>
                            <input 
                              type="number" 
                              value={editForm.cost} 
                              disabled={product.recipe && product.recipe.length > 0}
                              onChange={(e) => setEditForm(prev => ({ ...prev, cost: Number(e.target.value) }))}
                              className="w-full bg-white border border-[#0F6B41]/40 text-slate-800 pl-4 pr-1 py-1 rounded text-sm focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium text-right disabled:bg-slate-100 disabled:text-slate-400 dark:bg-[var(--bg-surface)] dark:text-zinc-100" 
                            />
                          </div>
                        ) : (
                          <span className="font-body-md text-slate-600 dark:text-zinc-300 font-medium tabular-nums">
                            {formatMoney(product.cost || 0)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-body-md text-right whitespace-nowrap">
                        {isEditing && !hasVariants ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="relative w-20">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs dark:text-zinc-400">$</span>
                              <input 
                                type="number" 
                                value={editForm.price} 
                                onChange={(e) => setEditForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                                className="w-full bg-white border border-[#0F6B41]/40 text-slate-800 pl-5 pr-2 py-1 rounded text-sm focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium dark:bg-[var(--bg-surface)] dark:text-zinc-100" 
                              />
                            </div>
                            <span className="text-slate-400 dark:text-zinc-400">/</span>
                            <div className="relative w-20">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs dark:text-zinc-400">$</span>
                              <input 
                                type="number" 
                                value={editForm.takeawayPrice} 
                                onChange={(e) => setEditForm(prev => ({ ...prev, takeawayPrice: Number(e.target.value) }))}
                                className="w-full bg-white border border-[#0F6B41]/40 text-[#0F6B41] pl-5 pr-2 py-1 rounded text-sm focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium dark:bg-[var(--bg-surface)] dark:text-emerald-400" 
                              />
                            </div>
                          </div>
                        ) : hasVariants ? (
                          <span className="text-slate-500 italic text-sm dark:text-zinc-400">{product.variants?.length} Variantes</span>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <span className="text-on-surface tabular-nums">{formatMoney(product.price || 0)}</span>
                            <span className="text-slate-400 mx-1 dark:text-zinc-400">/</span>
                            <span className="text-[#0F6B41] font-medium tabular-nums dark:text-emerald-400">{formatMoney(product.takeawayPrice || 0)}</span>
                            <button onClick={() => setHistoryModalItem(product)} className="text-slate-400 hover:text-[#0F6B41] transition-colors ml-1 p-0.5 rounded-md hover:bg-emerald-50 dark:text-zinc-400" title="Ver Historial de Precios">
                              <History className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <input 
                            type="checkbox"
                            checked={editForm.status === 'active'}
                            onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.checked ? 'active' : 'inactive' }))}
                            className="w-4 h-4 text-[#0F6B41] border-slate-350 rounded focus:ring-[#0F6B41] dark:text-emerald-400"
                          />
                        ) : (
                          <span className={cn(
                            "px-2.5 py-0.5 text-xs font-bold rounded-full",
                            product.status === 'active' ? "bg-emerald-50 text-[#0F6B41] border border-emerald-100 dark:text-emerald-400" : "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-zinc-400"
                          )}>
                            {product.status === 'active' ? 'Disponible' : 'Oculto'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isLowStock ? (
                          <span className="px-3 py-1 bg-red-100 text-red-700 font-status-badge text-status-badge rounded-full whitespace-nowrap inline-block dark:bg-rose-950/50 dark:text-rose-300">Stock Bajo</span>
                        ) : (
                          <span className="px-3 py-1 bg-green-100 text-green-700 font-status-badge text-status-badge rounded-full whitespace-nowrap inline-block dark:bg-emerald-950/50 dark:text-emerald-300">En Stock</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-end">
                            <button onClick={saveEditing} className="text-[#0F6B41] hover:text-[#0C5734] transition-colors p-1 dark:text-emerald-400" title="Guardar">
                              <Save className="w-5 h-5" />
                            </button>
                            <button onClick={cancelEditing} className="text-slate-400 hover:text-slate-600 transition-colors p-1 ml-1 dark:text-zinc-400" title="Cancelar">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                            <div className="flex items-center justify-end">
                              <button onClick={() => startEditing(product)} className="text-slate-400 hover:text-primary transition-colors p-1 dark:text-zinc-400">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button className="text-slate-400 hover:text-error transition-colors p-1 ml-1 dark:text-zinc-400">
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
                            "bg-slate-50/50 dark:bg-white/5 border-b border-dashed border-slate-200 transition-colors dark:border-white/10",
                            isVarLowStock && !isVarEditing ? "bg-red-50/30 border-l-4 border-l-error" : "border-l-4 border-l-transparent",
                            isVarEditing ? "bg-emerald-50/30" : ""
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
                                          className="w-full bg-white border border-[#0F6B41]/40 text-slate-800 px-2 py-1 rounded text-xs focus:ring-2 focus:ring-[#0F6B41] outline-none font-bold dark:bg-[var(--bg-surface)] dark:text-zinc-100" 
                                        />
                                        <div className="flex gap-1">
                                          <input 
                                            type="text" 
                                            value={editForm.sku} 
                                            onChange={(e) => setEditForm(prev => ({ ...prev, sku: e.target.value }))}
                                            placeholder="SKU"
                                            className="w-1/2 bg-white border border-[#0F6B41]/40 text-slate-500 px-2 py-1 rounded text-[9px] focus:ring-2 focus:ring-[#0F6B41] outline-none dark:bg-[var(--bg-surface)] dark:text-zinc-400" 
                                          />
                                          <input 
                                            type="text" 
                                            value={editForm.barcode} 
                                            onChange={(e) => setEditForm(prev => ({ ...prev, barcode: e.target.value }))}
                                            placeholder="Barcode"
                                            className="w-1/2 bg-white border border-[#0F6B41]/40 text-[#0F6B41] px-2 py-1 rounded text-[9px] focus:ring-2 focus:ring-[#0F6B41] outline-none font-bold dark:bg-[var(--bg-surface)] dark:text-emerald-400" 
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <p className={cn("text-sm font-bold", isVarLowStock && !isVarEditing ? "text-error dark:text-rose-300" : "text-on-surface")}>{variant.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <p className="text-[9px] text-on-surface-variant font-medium bg-white px-1.5 py-0.5 rounded border border-slate-200 uppercase dark:bg-[var(--bg-surface)] dark:border-white/10">SKU: {variant.sku}</p>
                                          {variant.barcode && (
                                            <p className="text-[9px] text-[#0F6B41] font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1 dark:text-emerald-400">
                                              <Receipt className="w-2.5 h-2.5" /> {variant.barcode}
                                            </p>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                             </td>
                          <td className="px-6 py-3 font-body-md text-slate-400 text-sm dark:text-zinc-400">--</td>
                          <td className="px-6 py-3 text-right">
                            {isVarEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <input 
                                  type="number" 
                                  value={editForm.stock} 
                                  onChange={(e) => setEditForm(prev => ({ ...prev, stock: Number(e.target.value) }))}
                                  className="w-14 bg-white border border-[#0F6B41]/40 text-slate-800 px-1.5 py-0.5 rounded text-xs focus:ring-2 focus:ring-[#0F6B41] outline-none text-right font-medium dark:bg-[var(--bg-surface)] dark:text-zinc-100" 
                                />
                                <input 
                                  type="text" 
                                  value={editForm.unit} 
                                  onChange={(e) => setEditForm(prev => ({ ...prev, unit: e.target.value }))}
                                  className="w-14 bg-white border border-[#0F6B41]/40 text-slate-500 px-1 py-0.5 rounded text-[10px] focus:ring-2 focus:ring-[#0F6B41] outline-none dark:bg-[var(--bg-surface)] dark:text-zinc-400" 
                                />
                              </div>
                            ) : (
                              <span className={cn("font-body-md text-sm", isVarLowStock && !isVarEditing ? "text-error font-bold dark:text-rose-300" : "text-on-surface font-medium")}>
                                {variant.stock} {variant.unit || product.unit}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right">
                            {isVarEditing ? (
                              <div className="relative w-16 ml-auto">
                                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px] dark:text-zinc-400">$</span>
                                <input 
                                  type="number" 
                                  value={editForm.cost} 
                                  onChange={(e) => setEditForm(prev => ({ ...prev, cost: Number(e.target.value) }))}
                                  className="w-full bg-white border border-[#0F6B41]/40 text-slate-800 pl-3 pr-1 py-0.5 rounded text-xs focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium text-right dark:bg-[var(--bg-surface)] dark:text-zinc-100" 
                                />
                              </div>
                            ) : (
                              <span className="font-body-md text-slate-500 text-sm tabular-nums dark:text-zinc-400">
                                {formatMoney(variant.cost || 0)}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3 font-body-md text-right whitespace-nowrap text-sm">
                            {isVarEditing ? (
                              <div className="flex items-center justify-end gap-2">
                                <div className="relative w-20">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs dark:text-zinc-400">$</span>
                                  <input 
                                    type="number" 
                                    value={editForm.price} 
                                    onChange={(e) => setEditForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                                    className="w-full bg-white border border-[#0F6B41]/40 text-slate-800 pl-5 pr-2 py-1 rounded text-xs focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium dark:bg-[var(--bg-surface)] dark:text-zinc-100" 
                                  />
                                </div>
                                <span className="text-slate-400 dark:text-zinc-400">/</span>
                                <div className="relative w-20">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs dark:text-zinc-400">$</span>
                                  <input 
                                    type="number" 
                                    value={editForm.takeawayPrice}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, takeawayPrice: Number(e.target.value) }))}
                                    className="w-full bg-white border border-[#0F6B41]/40 text-[#0F6B41] pl-5 pr-2 py-1 rounded text-xs focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium dark:bg-[var(--bg-surface)] dark:text-emerald-400" 
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                <span className="text-on-surface tabular-nums">{formatMoney(variant.price || 0)}</span>
                                <span className="text-slate-400 mx-1 dark:text-zinc-400">/</span>
                                <span className="text-[#0F6B41] font-medium tabular-nums dark:text-emerald-400">{formatMoney(variant.takeawayPrice || 0)}</span>
                                <button onClick={() => setHistoryModalItem(variant)} className="text-slate-400 hover:text-[#0F6B41] transition-colors ml-1 p-0.5 rounded-md hover:bg-emerald-50 dark:text-zinc-400" title="Ver Historial de Precios">
                                  <History className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {isVarEditing ? (
                              <input 
                                type="checkbox"
                                checked={editForm.status === 'active'}
                                onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.checked ? 'active' : 'inactive' }))}
                                className="w-3.5 h-3.5 text-[#0F6B41] border-slate-350 rounded focus:ring-[#0F6B41] dark:text-emerald-400"
                              />
                            ) : (
                              <span className={cn(
                                "px-2 py-0.2 text-[10px] font-bold rounded-full",
                                variant.status === 'active' ? "bg-emerald-50 text-[#0F6B41] border border-emerald-100 dark:text-emerald-400" : "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-zinc-400"
                              )}>
                                {variant.status === 'active' ? 'Disponible' : 'Oculto'}
                              </span>
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
                                <button onClick={saveEditing} className="text-[#0F6B41] hover:text-[#0C5734] transition-colors p-1 dark:text-emerald-400" title="Guardar">
                                  <Save className="w-4 h-4" />
                                </button>
                                <button onClick={cancelEditing} className="text-slate-400 hover:text-slate-600 transition-colors p-1 ml-1 dark:text-zinc-400" title="Cancelar">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end">
                                <button onClick={() => startEditing(variant)} className="text-slate-400 hover:text-primary transition-colors p-1 dark:text-zinc-400">
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button className="text-slate-400 hover:text-error transition-colors p-1 ml-1 dark:text-zinc-400">
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
      {isPurchaseListOpen && (
        <PurchaseListModal products={products} threshold={lowStockThreshold} onClose={() => setIsPurchaseListOpen(false)} />
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:bg-[var(--bg-surface)] dark:border-white/10" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0 dark:border-white/10 dark:bg-[var(--color-paper-subtle)]">
              <div>
                <h2 className="font-bold text-xl text-slate-800 dark:text-zinc-100">Nuevo Producto / Receta</h2>
                <p className="text-sm text-slate-500 font-medium dark:text-zinc-400">Define el producto y sus insumos descontables del inventario.</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors dark:text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
              {/* Left Column: Basic Info */}
              <div className="lg:w-1/2 p-6 border-r border-slate-100 space-y-6 dark:border-white/10">
                
                {/* Image Upload Area */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 dark:text-zinc-400">Imagen del Producto</label>
                  <div className="w-full h-40 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-400 hover:bg-emerald-50 transition-colors cursor-pointer group dark:border-white/15 dark:bg-[var(--color-paper-subtle)] dark:text-zinc-400">
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform dark:bg-[var(--bg-surface)]">
                      <ImageIcon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <span className="text-sm font-semibold text-slate-600 dark:text-zinc-300">Subir Imagen</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 mt-1 dark:text-zinc-400">PNG, JPG hasta 5MB</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 dark:text-zinc-400">Nombre</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Hamburguesa Doble" 
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium dark:bg-[var(--color-paper-subtle)] dark:border-white/10 dark:text-zinc-100" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-zinc-400">Categoría</label>
                        <button 
                          type="button"
                          onClick={() => setIsAddingCategory(!isAddingCategory)}
                          className="text-[10px] font-bold text-[#0F6B41] hover:text-[#0C5734] dark:text-emerald-400"
                        >
                          {isAddingCategory ? 'Cancelar' : '+ Nueva'}
                        </button>
                      </div>
                      
                      {isAddingCategory ? (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Categoría" 
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium dark:bg-[var(--color-paper-subtle)] dark:border-white/10 dark:text-zinc-100"
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
                            className="px-3 py-2 bg-[#0F6B41] text-white rounded-lg text-sm font-bold"
                            onClick={() => {
                              if (newCategoryName.trim()) {
                                setCategories([...categories, newCategoryName.trim()]);
                                setNewCategoryName('');
                                setIsAddingCategory(false);
                                setNewProductCategory(newCategoryName.trim());
                              }
                            }}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <select 
                          value={newProductCategory}
                          onChange={(e) => setNewProductCategory(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium appearance-none dark:bg-[var(--color-paper-subtle)] dark:border-white/10 dark:text-zinc-100"
                        >
                          {categories.map((cat, idx) => (
                            <option key={idx} value={cat}>{cat}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 dark:text-zinc-400">Código (SKU)</label>
                      <input 
                        type="text" 
                        placeholder="Ej. BUR-DOB-01" 
                        value={newProductSKU}
                        onChange={(e) => setNewProductSKU(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium dark:bg-[var(--color-paper-subtle)] dark:border-white/10 dark:text-zinc-100" 
                        disabled={hasVariants} 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between dark:text-zinc-400">
                        Código de Barras
                        <span className="text-[9px] bg-emerald-100 text-[#0F6B41] px-1 py-0.5 rounded dark:text-emerald-400">EAN</span>
                      </label>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="71234567..." 
                          value={newProductBarcode}
                          onChange={(e) => setNewProductBarcode(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 pl-4 pr-8 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium dark:bg-[var(--color-paper-subtle)] dark:border-white/10 dark:text-zinc-100" 
                          disabled={hasVariants} 
                        />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#0F6B41] dark:text-zinc-400" title="Escanear Producto">
                          <Search className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl my-4 dark:bg-[var(--color-paper-subtle)] dark:border-white/10">
                    <div className="flex items-center gap-3 flex-1">
                      <input 
                        type="checkbox" 
                        id="hasVariants" 
                        className="w-5 h-5 text-[#0F6B41] border-slate-350 rounded focus:ring-[#0F6B41] cursor-pointer dark:text-emerald-400" 
                        checked={hasVariants}
                        onChange={(e) => setHasVariants(e.target.checked)}
                      />
                      <label htmlFor="hasVariants" className="text-sm font-bold text-slate-700 cursor-pointer select-none dark:text-zinc-300">
                        Tiene variantes
                        <span className="block text-[10px] text-slate-450 font-normal">Tamaños, sabores, etc.</span>
                      </label>
                    </div>

                    <div className="w-[1px] bg-slate-200 self-stretch" />

                    <div className="flex items-center gap-3 flex-1">
                      <input 
                        type="checkbox" 
                        id="newProductIsMenuAvailable" 
                        className="w-5 h-5 text-[#0F6B41] border-slate-350 rounded focus:ring-[#0F6B41] cursor-pointer dark:text-emerald-400" 
                        checked={newProductIsMenuAvailable}
                        onChange={(e) => setNewProductIsMenuAvailable(e.target.checked)}
                      />
                      <label htmlFor="newProductIsMenuAvailable" className="text-sm font-bold text-slate-700 cursor-pointer select-none dark:text-zinc-300">
                        Disponible en Menú
                        <span className="block text-[10px] text-slate-450 font-normal">Mostrar en carta digital.</span>
                      </label>
                    </div>
                  </div>

                  {hasVariants ? (
                    <div className="space-y-4 border border-slate-200 rounded-xl p-4 bg-slate-50/50 dark:bg-white/5 dark:border-white/10">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Variantes</h4>
                        <button 
                          type="button"
                          onClick={() => setNewProductVariants([...newProductVariants, { id: Date.now().toString(), name: '', sku: '', price: 0, takeawayPrice: 0, stock: 0 }])}
                          className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-[#0F6B41] rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors dark:text-emerald-400"
                        >
                          <Plus className="w-3.5 h-3.5" /> Añadir Variante
                        </button>
                      </div>
                      
                      {newProductVariants.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4 dark:text-zinc-400">Añade variantes como "Pequeño", "Mediano", "Sabor Chocolate", etc.</p>
                      ) : (
                        <div className="space-y-3">
                          {newProductVariants.map((variant, index) => (
                            <div key={variant.id} className="flex gap-2 items-start bg-white p-3 border border-slate-200 rounded-lg shadow-sm dark:bg-[var(--bg-surface)] dark:border-white/10">
                              <div className="grid grid-cols-2 gap-2 flex-1">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 dark:text-zinc-400">Nombre Variante</label>
                                  <input 
                                    type="text" 
                                    placeholder="Ej. Pequeño" 
                                    value={variant.name}
                                    onChange={(e) => {
                                      const nv = [...newProductVariants]; nv[index].name = e.target.value; setNewProductVariants(nv);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 rounded text-xs focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium dark:bg-[var(--color-paper-subtle)] dark:border-white/10 dark:text-zinc-100" 
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 dark:text-zinc-400">SKU</label>
                                  <input 
                                    type="text" 
                                    placeholder="Ej. BUR-DOB-PEQ" 
                                    value={variant.sku}
                                    onChange={(e) => {
                                      const nv = [...newProductVariants]; nv[index].sku = e.target.value; setNewProductVariants(nv);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 rounded text-xs focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium dark:bg-[var(--color-paper-subtle)] dark:border-white/10 dark:text-zinc-100" 
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 dark:text-zinc-400">Precio</label>
                                  <input 
                                    type="number" 
                                    placeholder="0.00" 
                                    value={variant.price || ''}
                                    onChange={(e) => {
                                      const nv = [...newProductVariants]; nv[index].price = Number(e.target.value); setNewProductVariants(nv);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 rounded text-xs focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium dark:bg-[var(--color-paper-subtle)] dark:border-white/10 dark:text-zinc-100" 
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 dark:text-zinc-400">Precio P/Llevar</label>
                                  <input 
                                    type="number" 
                                    placeholder="0.00" 
                                    value={variant.takeawayPrice || ''}
                                    onChange={(e) => {
                                      const nv = [...newProductVariants]; nv[index].takeawayPrice = Number(e.target.value); setNewProductVariants(nv);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 rounded text-xs focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium dark:bg-[var(--color-paper-subtle)] dark:border-white/10 dark:text-zinc-100" 
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 dark:text-zinc-400">Stock Inicial</label>
                                  <input 
                                    type="number" 
                                    placeholder="0" 
                                    value={variant.stock || 0}
                                    onChange={(e) => {
                                      const nv = [...newProductVariants]; nv[index].stock = Number(e.target.value); setNewProductVariants(nv);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 rounded text-xs focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium dark:bg-[var(--color-paper-subtle)] dark:border-white/10 dark:text-zinc-100" 
                                  />
                                </div>
                              </div>
                              <button 
                                onClick={() => setNewProductVariants(newProductVariants.filter(v => v.id !== variant.id))}
                                className="mt-5 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors dark:text-zinc-400"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 dark:text-zinc-400">Precio Local</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold dark:text-zinc-400">$</span>
                            <input 
                              type="number" 
                              placeholder="0.00" 
                              value={newProductPrice}
                              onChange={(e) => setNewProductPrice(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-800 pl-6 pr-2 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium dark:bg-[var(--color-paper-subtle)] dark:border-white/10 dark:text-zinc-100" 
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 truncate dark:text-zinc-400" title="Precio Para Llevar">Precio P/Llevar</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold dark:text-zinc-400">$</span>
                            <input 
                              type="number" 
                              placeholder="0.00" 
                              value={newProductTakeawayPrice}
                              onChange={(e) => setNewProductTakeawayPrice(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-800 pl-6 pr-2 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium dark:bg-[var(--color-paper-subtle)] dark:border-white/10 dark:text-zinc-100" 
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 dark:text-zinc-400">Costo Unitario</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold dark:text-zinc-400">$</span>
                            <input 
                              type="number" 
                              placeholder="0.00" 
                              value={ingredients.length > 0 ? recipeCost.toFixed(2) : newProductCost}
                              disabled={ingredients.length > 0}
                              onChange={(e) => setNewProductCost(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-850 pl-6 pr-2 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium disabled:bg-slate-200 disabled:text-slate-500 dark:bg-[var(--color-paper-subtle)] dark:border-white/10" 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 dark:text-zinc-400">Stock Inicial</label>
                          <input 
                            type="number" 
                            placeholder="0" 
                            value={newProductStock}
                            onChange={(e) => setNewProductStock(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium dark:bg-[var(--color-paper-subtle)] dark:border-white/10 dark:text-zinc-100" 
                          />
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 mt-3 dark:text-zinc-400">Stock mínimo (alerta)</label>
                          <input
                            type="number"
                            placeholder={`General: ${lowStockThreshold}`}
                            value={newProductMinStock}
                            onChange={(e) => setNewProductMinStock(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium dark:bg-[var(--color-paper-subtle)] dark:border-white/10 dark:text-zinc-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 dark:text-zinc-400">Unidad de Medida</label>
                          <select 
                            value={newProductUnit}
                            onChange={(e) => setNewProductUnit(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium appearance-none dark:bg-[var(--color-paper-subtle)] dark:border-white/10 dark:text-zinc-100"
                          >
                            <option value="Unidades">Unidades</option>
                            <option value="g">Gramos (g)</option>
                            <option value="kg">Kilogramos (kg)</option>
                            <option value="ml">Mililitros (ml)</option>
                            <option value="l">Litros (l)</option>
                            <option value="Porciones">Porciones</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Right Column: Ingredients/Recipe */}
              <div className="lg:w-1/2 p-6 flex flex-col bg-slate-50/50 dark:bg-white/5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider dark:text-zinc-100">Insumos (Receta)</h3>
                    <p className="text-xs text-slate-500 font-medium dark:text-zinc-400">Elementos a descontar del stock por cada venta.</p>
                  </div>
                  <button 
                    onClick={handleAddIngredient}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-[#0F6B41] rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors dark:text-emerald-400"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                  {ingredients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-white border border-slate-200 border-dashed rounded-xl h-40 dark:bg-[var(--bg-surface)] dark:border-white/10">
                      <Package className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400">Sin insumos configurados.</p>
                      <p className="text-xs text-slate-400 mt-1 dark:text-zinc-400">Este producto no descontará nada del inventario por defecto, a menos que agregues insumos.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ingredients.map((ing) => (
                        <div key={ing.id} className="flex gap-2 items-start bg-white p-3 border border-slate-200 rounded-xl shadow-sm dark:bg-[var(--bg-surface)] dark:border-white/10">
                          <div className="flex-1">
                            <select
                              value={ing.ingredientId || ''}
                              onChange={(e) => {
                                const selectedId = Number(e.target.value);
                                const selectedProd = products.find(p => p.id === selectedId);
                                setIngredients(ingredients.map(i => i.id === ing.id ? {
                                  ...i,
                                  ingredientId: selectedId,
                                  name: selectedProd?.name || '',
                                  unit: selectedProd?.unit || 'g'
                                } : i));
                              }}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B41] outline-none font-medium dark:bg-[var(--color-paper-subtle)] dark:border-white/10"
                            >
                              <option value="">-- Seleccionar Insumo --</option>
                              {products.filter(p => !p.variants || p.variants.length === 0).map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({formatMoney(p.cost || 0)}/{p.unit})</option>
                              ))}
                            </select>
                          </div>
                          <div className="w-24">
                            <input 
                              type="number" 
                              placeholder="0" 
                              value={ing.quantity}
                              onChange={(e) => setIngredients(ingredients.map(i => i.id === ing.id ? {...i, quantity: Number(e.target.value)} : i))}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-[#0F6B41] outline-none font-bold dark:bg-[var(--color-paper-subtle)] dark:border-white/10" 
                            />
                          </div>
                          <div className="w-20 pt-2 text-center text-xs font-bold text-slate-500 dark:text-zinc-400">
                            {ing.unit}
                          </div>
                          <button 
                            onClick={() => handleRemoveIngredient(ing.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors dark:text-zinc-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Totals */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-500 uppercase tracking-wider dark:text-zinc-400">Costo Receta Calculado:</span>
                    <span className="font-bold text-[#0F6B41] text-lg dark:text-emerald-400">{formatMoney(recipeCost)}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0 dark:border-white/10 dark:bg-[var(--color-paper-subtle)]">
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors dark:bg-[var(--bg-surface)] dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
              >
                Cancelar
              </button>
              <button 
                className="px-6 py-2.5 bg-[#0F6B41] text-white font-bold text-sm rounded-xl shadow-lg shadow-sm hover:bg-[#0C5734] transition-colors flex items-center gap-2"
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:bg-[var(--bg-surface)] dark:border-white/10">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 dark:border-white/10 dark:bg-[var(--color-paper-subtle)]">
              <div>
                <h2 className="font-bold text-lg text-slate-800 dark:text-zinc-100">Historial de Precios</h2>
                <p className="text-sm text-slate-500 font-medium dark:text-zinc-400">{historyModalItem.name}</p>
              </div>
              <button 
                onClick={() => setHistoryModalItem(null)}
                className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors dark:text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {(!historyModalItem.priceHistory || historyModalItem.priceHistory.length === 0) ? (
                <div className="text-center py-8 text-slate-500 dark:text-zinc-400">
                  <History className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No hay historial de cambios para este producto.</p>
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {historyModalItem.priceHistory.map((entry: any, idx: number) => (
                    <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-[#0F6B41] text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 dark:text-zinc-400" />
                      <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 border border-slate-100 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:bg-[var(--bg-surface)] dark:border-white/10">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-slate-400 dark:text-zinc-400">
                            {new Date(entry.date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                          <div className="text-sm">
                            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded mb-1 border border-slate-100 dark:bg-[var(--color-paper-subtle)] dark:border-white/10">
                              <span className="text-slate-500 text-xs font-bold uppercase dark:text-zinc-400">Mesa</span>
                              <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-zinc-300">
                                <span className="line-through text-slate-400 opacity-70 dark:text-zinc-400">{formatMoney(entry.oldPrice || 0)}</span>
                                <span>→</span>
                                <span className="text-green-600">{formatMoney(entry.newPrice || 0)}</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100 dark:bg-[var(--color-paper-subtle)] dark:border-white/10">
                              <span className="text-slate-500 text-xs font-bold uppercase dark:text-zinc-400">Llevar</span>
                              <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-zinc-300">
                                <span className="line-through text-slate-400 opacity-70 dark:text-zinc-400">{formatMoney(entry.oldTakeaway || 0)}</span>
                                <span>→</span>
                                <span className="text-green-600">{formatMoney(entry.newTakeaway || 0)}</span>
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
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end dark:border-white/10 dark:bg-[var(--color-paper-subtle)]">
              <button 
                onClick={() => setHistoryModalItem(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-300 transition-colors dark:text-zinc-300"
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
