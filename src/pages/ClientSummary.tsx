import { useToast } from "../components/ui/Toast";
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../contexts/StoreContext';
import { useBusiness } from '../contexts/BusinessContext';
import { formatMoney } from '../lib/format';
import { 
  Utensils, Receipt, ShoppingBag, Clock, Plus, Minus, Send, 
  CheckCircle, XCircle, AlertCircle, Search, ShoppingCart, Menu
} from 'lucide-react';
import { cn } from '../lib/utils';


export function ClientSummary() {
  const { showToast } = useToast();
  const { tableId } = useParams<{ tableId: string }>();
  const { tables, products, clientOrders, submitClientOrder } = useStore();
  const { businessName, logo } = useBusiness();
  
  const [activeTab, setActiveTab] = useState<'consumo' | 'pedir' | 'pedidos'>('pedir');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [cart, setCart] = useState<Record<number, { product: any; qty: number }>>({});


  // Generate persistent customer session ID
  const [customerId] = useState(() => {
    let id = localStorage.getItem('comensal_id');
    if (!id) {
      id = `comensal_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('comensal_id', id);
    }
    return id;
  });

  const table = tables.find(t => t.id === tableId);
  const registeredOrder = table?.order || [];
  const registeredTotal = registeredOrder.reduce((acc, i) => acc + (i.price * i.qty), 0);

  if (!table) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Utensils className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Mesa no encontrada</h1>
        <p className="text-slate-500 mt-2">Por favor, escanea el código QR de tu mesa nuevamente.</p>
      </div>
    );
  }

  // Active products filter
  const activeProducts = products.filter(p => p.status !== 'inactive');
  
  // Unique categories
  const categories = ['Todos', ...Array.from(new Set(activeProducts.map(p => p.category)))];

  // Filtered products list
  const filteredProducts = activeProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart operations
  const addToCart = (product: any) => {
    if (!product.id) return;
    setCart(prev => {
      const existing = prev[product.id];
      return {
        ...prev,
        [product.id]: {
          product,
          qty: existing ? existing.qty + 1 : 1
        }
      };
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => {
      const existing = prev[productId];
      if (!existing) return prev;
      const next = { ...prev };
      if (existing.qty <= 1) {
        delete next[productId];
      } else {
        next[productId] = { ...existing, qty: existing.qty - 1 };
      }
      return next;
    });
  };

  const cartItems: { product: any; qty: number }[] = Object.values(cart);
  const cartTotal = cartItems.reduce((acc: number, item) => acc + (item.product.price * item.qty), 0);
  const cartItemCount = cartItems.reduce((acc: number, item) => acc + item.qty, 0);

  // Submit client order
  const handleSendOrder = async () => {
    if (cartItems.length === 0) return;
    
    const items = cartItems.map(c => ({
      id: c.product.id?.toString() || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: c.product.name,
      price: c.product.price,
      qty: c.qty
    }));

    try {
      await submitClientOrder(tableId!, customerId, items, cartTotal);
      setCart({});
      setActiveTab('pedidos');
    } catch (err) {
      console.error(err);
      showToast('Hubo un error al enviar tu pedido. Reintenta por favor.', 'error');
    }
  };

  // Past client orders sent in this session
  const myPastOrders = clientOrders.filter(co => co.tableId === tableId && co.customerId === customerId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto shadow-md border-x border-slate-200">
      {/* Mobile Header */}
      <header className="bg-white px-5 py-3.5 border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {logo ? (
              <img src={logo} alt="Logo" className="w-10 h-10 object-cover rounded-xl border border-slate-200 shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[#0F6B41] flex items-center justify-center text-white shrink-0">
                <Utensils className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-base font-bold text-[#1C1C1C] truncate leading-tight">{businessName}</h1>
              <p className="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-[#0F6B41]" /> Mesa {tableId?.replace('T-', '')}
              </p>
            </div>
          </div>
          <div className="min-h-[44px] min-w-[52px] bg-[#0F6B41] rounded-2xl flex flex-col items-center justify-center text-white shadow-md shrink-0 px-2">
            <span className="text-[9px] font-bold leading-none uppercase tracking-wider text-emerald-200">Mesa</span>
            <span className="text-lg font-bold leading-none mt-1 font-mono">{tableId?.replace('T-', '')}</span>
          </div>
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="flex bg-white border-b border-slate-200 sticky top-[69px] z-20">
        <button
          onClick={() => setActiveTab('pedir')}
          className={cn(
            "flex-1 min-h-[44px] py-2.5 text-center text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer",
            activeTab === 'pedir' ? "border-[#0F6B41] text-[#0F6B41]" : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          Carta / Pedir
        </button>
        <button
          onClick={() => setActiveTab('consumo')}
          className={cn(
            "flex-1 min-h-[44px] py-2.5 text-center text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer",
            activeTab === 'consumo' ? "border-[#0F6B41] text-[#0F6B41]" : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          Mi Consumo ({registeredOrder.length})
        </button>
        <button
          onClick={() => setActiveTab('pedidos')}
          className={cn(
            "flex-1 min-h-[44px] py-2.5 text-center text-xs font-semibold uppercase tracking-wider border-b-2 transition-all relative cursor-pointer",
            activeTab === 'pedidos' ? "border-[#0F6B41] text-[#0F6B41]" : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          Mis Envíos
          {myPastOrders.filter(o => o.status === 'pending').length > 0 && (
            <span className="absolute top-2.5 right-2 w-2.5 h-2.5 bg-[#FA4515] rounded-full animate-pulse" />
          )}
        </button>
      </div>


      <main className="flex-1 p-5 space-y-6 pb-28 overflow-y-auto">
        {/* Tab 1: Ordering menu */}
        {activeTab === 'pedir' && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar platos, bebidas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-[#182C24] border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold outline-none focus:border-[#0F6B41] focus:ring-1 focus:ring-[#0F6B41] text-slate-900 dark:text-white shadow-sm"
              />
            </div>

            {/* Categories filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer",
                    selectedCategory === cat 
                      ? "bg-[#0F6B41] border-[#0F6B41] text-white shadow-sm" 
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Catalog list */}
            <div className="grid grid-cols-1 gap-3">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-white border border-slate-100 rounded-3xl">
                  <Menu className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">No se encontraron productos</p>
                </div>
              ) : (
                filteredProducts.map(product => {
                  const cartItem = cart[product.id!];
                  return (
                    <div key={product.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                      <div className="flex-1 min-w-0 pr-4">
                        <span className="text-[10px] font-semibold text-[#0F6B41] uppercase tracking-wider">{product.category}</span>
                        <h4 className="font-semibold text-[#1C1C1C] truncate text-sm mt-0.5">{product.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-bold text-[#1C1C1C] text-base tabular-nums">{formatMoney(product.price)}</span>
                          {product.stock <= 3 && product.stock > 0 && (
                            <span className="text-[10px] font-semibold text-[#FA4515] bg-orange-50 px-2 py-0.5 rounded-md">¡Últimos {product.stock}!</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        {cartItem ? (
                          <>
                            <button 
                              onClick={() => removeFromCart(product.id!)}
                              className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-black w-4 text-center text-sm">{cartItem.qty}</span>
                            <button 
                              onClick={() => addToCart(product)}
                              disabled={product.stock <= cartItem.qty}
                              className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center font-bold transition-all",
                                product.stock <= cartItem.qty 
                                  ? "bg-slate-100 text-slate-300 cursor-not-allowed" 
                                  : "bg-[#0F6B41] text-white hover:bg-[#0c5734] shadow-sm cursor-pointer"
                              )}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            disabled={product.stock <= 0}
                            className={cn(
                              "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                              product.stock <= 0
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : "bg-emerald-50 text-[#0F6B41] hover:bg-emerald-100"
                            )}
                          >
                            {product.stock <= 0 ? 'Sin stock' : 'Agregar'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Registered table orders */}
        {activeTab === 'consumo' && (
          <div className="space-y-4">
            <div className={cn(
              "p-4 rounded-2xl border flex items-center gap-4",
              registeredOrder.length > 0 ? "bg-emerald-50 border-emerald-100" : "bg-slate-100 border-slate-200"
            )}>
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                registeredOrder.length > 0 ? "bg-[#0F6B41]/10 text-[#0F6B41]" : "bg-slate-200 text-slate-400"
              )}>
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {registeredOrder.length > 0 ? 'Consumo de la mesa' : 'Sin consumos todavía'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {registeredOrder.length > 0 ? `${registeredOrder.length} productos registrados en sistema` : 'Los productos aprobados aparecerán aquí.'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Detalle del ticket</h3>
              </div>
              
              <div className="divide-y divide-slate-100">
                {registeredOrder.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <p className="text-sm font-semibold">No hay consumos registrados aún.</p>
                  </div>
                ) : (
                  registeredOrder.map((item: any, idx: number) => (
                    <div key={idx} className="p-4 flex justify-between items-center">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">
                          {item.qty}x
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">{item.name}</h4>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight tabular-nums">{formatMoney(item.price)} c/u</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 text-sm tabular-nums">{formatMoney(item.price * item.qty)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {registeredOrder.length > 0 && (
                <div className="p-6 bg-[#1E4437] text-white">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-200 font-semibold uppercase tracking-widest text-xs">Total consumido</span>
                    <span className="text-2xl font-bold text-white tabular-nums">{formatMoney(registeredTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex gap-3">
              <div className="p-2 bg-white rounded-lg h-fit shadow-sm">
                <Utensils className="w-4 h-4 text-[#0F6B41]" />
              </div>
              <p className="text-xs text-[#1E4437] font-medium leading-relaxed">
                Este es un resumen de tu consumo actual. Para pedir algo más, utilizá la pestaña de "Carta" o solicitá la cuenta al personal.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Session orders sent and their status */}
        {activeTab === 'pedidos' && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">Pedidos enviados por QR</h3>
            {myPastOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-white border border-slate-100 rounded-3xl">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">No has enviado ningún pedido todavía.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myPastOrders.map((order, idx) => (
                  <div key={idx} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-xs text-slate-400 font-bold">{new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <h4 className="text-xs font-black text-slate-800 mt-0.5">Monto: ${order.total.toLocaleString()}</h4>
                      </div>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5",
                        order.status === 'pending' && "bg-amber-50 text-amber-700 border border-amber-100",
                        order.status === 'approved' && "bg-emerald-50 text-emerald-700 border border-emerald-100",
                        order.status === 'rejected' && "bg-rose-50 text-rose-700 border border-rose-100"
                      )}>
                        {order.status === 'pending' && (
                          <>
                            <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                            Pendiente
                          </>
                        )}
                        {order.status === 'approved' && (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            Aprobado
                          </>
                        )}
                        {order.status === 'rejected' && (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Rechazado
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      {order.items.map((it: any, itemIdx: number) => (
                        <div key={itemIdx} className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>{it.qty}x {it.name}</span>
                          <span className="tabular-nums">{formatMoney(it.price * it.qty)}</span>
                        </div>
                      ))}
                    </div>
                    
                    {order.status === 'pending' && (
                      <div className="p-3 bg-amber-50 rounded-xl flex items-start gap-2 text-[11px] text-amber-800 font-semibold border border-amber-200">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>Pedido enviado. Esperando confirmación del personal.</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Cart Bar (at bottom of screen) */}
      {cartItemCount > 0 && activeTab === 'pedir' && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 z-40">
          <button
            onClick={handleSendOrder}
            className="w-full min-h-[48px] py-3.5 bg-[#FA4515] hover:bg-[#e03a0e] text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-between px-6 transition-all active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span>Enviar pedido ({cartItemCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider opacity-85">Total</span>
              <span className="text-lg font-bold tabular-nums">{formatMoney(cartTotal)}</span>
              <Send className="w-4 h-4 ml-1" />
            </div>
          </button>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="p-6 text-center text-slate-500 border-t border-slate-200 bg-white">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1E4437] mb-0.5">LYNX BarOS</p>
        <p className="text-[11px] text-slate-400">Mesa {tableId} • by LYNX</p>
      </footer>
    </div>
  );
}
