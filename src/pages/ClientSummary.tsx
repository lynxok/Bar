import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../contexts/StoreContext';
import { 
  Utensils, Receipt, ShoppingBag, Clock, Plus, Minus, Send, 
  CheckCircle, XCircle, AlertCircle, Search, ShoppingCart, Menu
} from 'lucide-react';
import { cn } from '../lib/utils';

export function ClientSummary() {
  const { tableId } = useParams<{ tableId: string }>();
  const { tables, products, clientOrders, submitClientOrder } = useStore();
  
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
      alert('Hubo un error al enviar tu pedido. Reintenta por favor.');
    }
  };

  // Past client orders sent in this session
  const myPastOrders = clientOrders.filter(co => co.tableId === tableId && co.customerId === customerId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto shadow-md border-x border-slate-200">
      {/* Mobile Header */}
      <header className="bg-white px-6 py-4 border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900">LYNX BarOS</h1>
            <p className="text-xs text-slate-500 font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-500" /> Mesa {tableId}
            </p>
          </div>
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shadow-indigo-100">
            <span className="text-[10px] font-black leading-none uppercase tracking-tighter">Mesa</span>
            <span className="text-lg font-black leading-none mt-0.5">{tableId?.replace('T-', '')}</span>
          </div>
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="flex bg-white border-b border-slate-200 sticky top-[77px] z-20">
        <button
          onClick={() => setActiveTab('pedir')}
          className={cn(
            "flex-1 py-3 text-center text-xs font-black uppercase tracking-wider border-b-4 transition-all",
            activeTab === 'pedir' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Carta / Pedir
        </button>
        <button
          onClick={() => setActiveTab('consumo')}
          className={cn(
            "flex-1 py-3 text-center text-xs font-black uppercase tracking-wider border-b-4 transition-all",
            activeTab === 'consumo' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Mi Consumo ({registeredOrder.length})
        </button>
        <button
          onClick={() => setActiveTab('pedidos')}
          className={cn(
            "flex-1 py-3 text-center text-xs font-black uppercase tracking-wider border-b-4 transition-all relative",
            activeTab === 'pedidos' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Mis Envios
          {myPastOrders.filter(o => o.status === 'pending').length > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
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
                className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
              />
            </div>

            {/* Categories filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border",
                    selectedCategory === cat 
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100" 
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
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
                    <div key={product.id} className="bg-white p-4 rounded-3xl border border-slate-150 flex items-center justify-between shadow-sm">
                      <div className="flex-1 min-w-0 pr-4">
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider">{product.category}</span>
                        <h4 className="font-bold text-slate-800 truncate text-sm mt-0.5">{product.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-black text-slate-900 text-base">${product.price.toLocaleString()}</span>
                          {product.stock <= 3 && product.stock > 0 && (
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">¡Últimos {product.stock}!</span>
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
                                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100"
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
                              "px-3.5 py-1.5 rounded-xl text-xs font-black transition-all",
                              product.stock <= 0
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                            )}
                          >
                            {product.stock <= 0 ? 'Sin Stock' : 'Agregar'}
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
                registeredOrder.length > 0 ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400"
              )}>
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">
                  {registeredOrder.length > 0 ? 'Consumo de la Mesa' : 'Sin consumos todavía'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {registeredOrder.length > 0 ? `${registeredOrder.length} productos registrados en sistema` : 'Los productos aprobados aparecerán aquí.'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Detalle del Ticket</h3>
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
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">
                          {item.qty}x
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{item.name}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">${item.price} c/u</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 text-sm">${(item.price * item.qty).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {registeredOrder.length > 0 && (
                <div className="p-6 bg-slate-900 text-white">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Total Consumido</span>
                    <span className="text-2xl font-black text-white">${registeredTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3">
              <div className="p-2 bg-white rounded-lg h-fit shadow-sm">
                <Utensils className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xs text-indigo-800 font-medium leading-relaxed">
                Este es un resumen de tu consumo actual. Para pedir algo más, utiliza la pestaña de "Carta" o llama al mozo para solicitar la cuenta.
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
                        <div key={itemIdx} className="flex justify-between text-xs font-bold text-slate-600">
                          <span>{it.qty}x {it.name}</span>
                          <span>${(it.price * it.qty).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    
                    {order.status === 'pending' && (
                      <div className="p-3 bg-amber-50/50 rounded-xl flex items-start gap-2 text-[10px] text-amber-800 font-semibold border border-amber-100/50">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>Pedido Enviado - Esperando confirmación del mozo. Te notificaremos aquí al instante.</span>
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
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 z-40">
          <button
            onClick={handleSendOrder}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl flex items-center justify-between px-6 transition-all active:scale-[0.98] animate-in slide-in-from-bottom duration-300"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span>Enviar Pedido ({cartItemCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Total</span>
              <span className="text-base font-black">${cartTotal.toLocaleString()}</span>
              <Send className="w-4 h-4 ml-1" />
            </div>
          </button>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="p-6 text-center text-slate-400 border-t border-slate-100 bg-white">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-0.5">LYNX BarOS</p>
        <p className="text-[8px]">Mesa {tableId} • Sesión #{customerId.slice(-4)}</p>
      </footer>
    </div>
  );
}
