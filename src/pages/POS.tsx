import { useState } from "react";
import {
  Search,
  Barcode,
  Utensils,
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  Wallet,
  CreditCard,
  X,
  Clock,
  User,
  ArrowRightLeft,
  ChefHat,
  Smartphone,
  Gift,
  CheckCircle2,
} from "lucide-react";
import { useStore } from "../contexts/StoreContext";
import { useBusiness } from "../contexts/BusinessContext";
import { cn } from "../lib/utils";
import { LoggerService } from "../lib/LoggerService";

export function POS() {
  const { closePOSOrder, addComanda, customers, rewards, redeemPoints, comandas, products } = useStore();

  const getEstimatedWaitTime = () => {
    if (cart.length === 0) return 0;
    const activeComandas = comandas.filter(c => c.status === 'pending' || c.status === 'preparing').length;
    const queueDelay = activeComandas * 3;
    let maxPrep = 10;
    cart.forEach(cartItem => {
      const prod = products.find(p => p.name === cartItem.name);
      if (prod && prod.prepCount && prod.prepCount >= 5) {
        const avg = prod.prepTimeTotal! / prod.prepCount;
        if (avg > maxPrep) maxPrep = avg;
      }
    });
    return Math.round(maxPrep + queueDelay);
  };

  const { taxRate } = useBusiness();
  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Efectivo');
  const [loyaltyId, setLoyaltyId] = useState('');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('dine-in');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');

  // Búsqueda y filtro de categoría funcionales
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Todo');
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');

  // Deriva las categorías dinámicamente desde los productos reales
  const categories = ['Todo', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery));
    const matchesCategory = activeCategory === 'Todo' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: any) => {
    const currentPrice = orderType === 'takeaway' ? product.takeawayPrice : product.price;
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id.toString());
      if (exists) {
        return prev.map(i => i.id === product.id.toString() ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { id: product.id.toString(), name: product.name, price: currentPrice, qty: 1 }];
    });
  };

  const handleBarcodeLookup = () => {
    if (!barcodeInput.trim()) return;
    const found = products.find(
      p => p.barcode && p.barcode.toLowerCase() === barcodeInput.trim().toLowerCase()
    );
    if (found) {
      addToCart(found);
      setBarcodeInput('');
      setIsScannerOpen(false);
    } else {
      alert(`No se encontró ningún producto con código "${barcodeInput}".`);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const item = prev.find(i => i.id === id);
      if (item && item.qty > 1) {
        return prev.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const subtotal = cart.reduce((acc, i) => acc + i.price * i.qty, 0);
  const taxes = subtotal * (taxRate / 100);
  const total = subtotal + taxes;

  const handleProcessPayment = async () => {
    if (cart.length === 0) return;
    try {
      await closePOSOrder(cart, total, selectedPaymentMethod, loyaltyId || undefined);
      await LoggerService.audit('SALE', 'POS', `Venta rápida: $${total.toFixed(2)} (${selectedPaymentMethod})`);
      setCart([]);
      setLoyaltyId('');
      setIsCheckoutModalOpen(false);
    } catch (err: any) {
      alert(`Error al procesar el pago: ${err.message}`);
    }
  };

  const currentCustomer = customers.find(c => c.dni === loyaltyId || c.id?.toString() === loyaltyId);

  const handleRedeem = async (prize: any) => {
    if (!currentCustomer) return;
    try {
      await redeemPoints(currentCustomer.dni, prize.pointsCost, `Canje Recompensa POS: ${prize.name}`);
      alert(`Recompensa "${prize.name}" canjeada con éxito!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col xl:grid xl:grid-cols-12 gap-0 xl:gap-6 overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-0 xl:p-6 transition-colors duration-500">
      
      {/* Mobile Tab Selector */}
      <div className="xl:hidden flex bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 sticky top-0 z-20 shadow-sm">
        <button 
          onClick={() => setMobileTab('products')}
          className={cn(
            "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
            mobileTab === 'products' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 dark:text-slate-400"
          )}
        >
          <Utensils className="w-4 h-4" /> Productos
        </button>
        <button 
          onClick={() => setMobileTab('cart')}
          className={cn(
            "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 relative",
            mobileTab === 'cart' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 dark:text-slate-400"
          )}
        >
          <ShoppingBag className="w-4 h-4" /> Carrito
          {cart.length > 0 && (
            <span className="absolute top-2 right-1/4 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-slate-900">
              {cart.reduce((acc, i) => acc + i.qty, 0)}
            </span>
          )}
        </button>
      </div>

      <section className={cn(
        "xl:col-span-8 flex flex-col gap-4 overflow-hidden max-h-full p-4 xl:p-0",
        mobileTab === 'products' ? "flex" : "hidden xl:flex"
      )}>
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400"
              placeholder="Buscar por nombre o código de barras..."
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setBarcodeInput(''); setIsScannerOpen(true); }}
            className="h-12 px-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-2 font-bold transition-all active:scale-95 shadow-sm"
          >
            <Barcode className="h-5 w-5" />
            Escanear
          </button>
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <button
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all",
                orderType === 'dine-in' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
              onClick={() => setOrderType('dine-in')}
            >
              <Utensils className="h-4 w-4" /> Mesa
            </button>
            <button
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all",
                orderType === 'takeaway' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
              onClick={() => setOrderType('takeaway')}
            >
              <ShoppingBag className="h-4 w-4" /> Llevar
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "whitespace-nowrap px-5 h-11 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center border",
                activeCategory === cat
                  ? "bg-indigo-600 text-white shadow-md border-transparent"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-1 grid auto-rows-max grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-4 flex flex-col items-center justify-center h-48 text-slate-400 opacity-60 gap-3">
              <Search className="w-10 h-10" />
              <p className="text-sm font-bold">Sin resultados para "{searchQuery}"</p>
            </div>
          ) : (
            filteredProducts.map(product => {
              const currentPrice = orderType === 'takeaway' ? product.takeawayPrice : product.price;
              const inCart = cart.find(i => i.id === product.id?.toString());
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={cn(
                    "group bg-white dark:bg-slate-900 border rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95 text-left flex flex-col min-h-[200px]",
                    inCart ? "border-indigo-600 ring-2 ring-indigo-600/20" : "border-slate-200 dark:border-slate-800"
                  )}
                >
                  <div className="h-28 bg-slate-50 dark:bg-slate-800 overflow-hidden relative w-full shrink-0 flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
                    {(product as any).image ? (
                      <img src={(product as any).image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600">
                        <ShoppingBag className="w-10 h-10 opacity-40" />
                      </div>
                    )}
                    {product.popular && (
                      <div className="absolute top-3 right-3 bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase shadow-lg">POPULAR</div>
                    )}
                    {inCart && (
                      <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 shadow-lg">
                        <CheckCircle2 className="w-3 h-3" /> {inCart.qty}
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <h4 className="font-black text-sm leading-tight text-slate-800 dark:text-white">{product.name}</h4>
                    <div className="mt-2 flex items-baseline gap-2">
                      <p className="text-indigo-600 dark:text-indigo-400 font-black text-lg">${currentPrice.toFixed(2)}</p>
                      {orderType === 'takeaway' && (
                        <p className="text-slate-400 font-medium text-xs line-through">${product.price.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className={cn(
        "xl:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none xl:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden max-h-full transition-colors duration-500",
        mobileTab === 'cart' ? "flex" : "hidden xl:flex"
      )}>
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <div>
            <h3 className="font-black text-2xl text-slate-900 dark:text-white">Pedido Actual</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{orderType === 'dine-in' ? 'Pedido Rápido' : 'Para Llevar'}</p>
          </div>
          <button onClick={() => setCart([])} className="h-12 w-12 flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-2xl transition-all active:scale-95" title="Vaciar carrito">
            <Trash2 className="h-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-600">
              <ShoppingBag className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm font-black uppercase tracking-widest opacity-40">El carrito está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-4 bg-white dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-900/50">
                <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shrink-0 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 text-sm">
                  {item.qty}×
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-black text-sm text-slate-800 dark:text-white truncate">{item.name}</h5>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">${(item.price * item.qty).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => removeFromCart(item.id)} className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/30 active:scale-95 text-slate-500 transition-all">
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const prod = products.find(p => p.id?.toString() === item.id);
                      if (prod) addToCart(prod);
                    }}
                    className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 active:scale-95 shadow-md transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-8 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div className="space-y-3 mb-8">
            <div className="flex justify-between text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              <span>Impuestos ({taxRate}%)</span><span>${taxes.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-3xl font-black text-slate-900 dark:text-white pt-4 border-t border-slate-200 dark:border-slate-700">
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>
            {cart.length > 0 && (
              <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-2xl mt-4 border border-indigo-100 dark:border-indigo-900/50">
                <span className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">
                  <Clock className="w-4 h-4" /> Tiempo Estimado
                </span>
                <span className="font-black text-indigo-700 dark:text-indigo-300 text-xl">~{getEstimatedWaitTime()} min</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => { addComanda('POS', cart); alert("Pedido enviado a cocina"); }}
              disabled={cart.length === 0}
              className="w-full h-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-widest rounded-2xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-40"
            >
              <ChefHat className="h-6 w-6 text-indigo-600 dark:text-indigo-400" /> COCINA
            </button>
            <button
              onClick={() => setIsCheckoutModalOpen(true)}
              disabled={cart.length === 0}
              className="w-full h-16 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-40"
            >
              <Wallet className="h-6 w-6" /> COBRAR
            </button>
          </div>
        </div>
      </section>

      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xl z-[200] flex items-center justify-center p-6" onClick={() => setIsCheckoutModalOpen(false)}>
          <div 
            className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="font-black text-2xl text-slate-900 dark:text-white tracking-tight">Finalizar Venta</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Selecciona el método y fidelización</p>
              </div>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="p-3 text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-rose-500 rounded-full transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                <X className="w-7 h-7" />
              </button>
            </div>

            <div className="p-10 space-y-8 max-h-[75vh] overflow-y-auto">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Método de Pago</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'Efectivo', icon: Wallet, label: 'Efectivo' },
                    { id: 'Tarjeta', icon: CreditCard, label: 'Tarjeta' },
                    { id: 'Transferencia', icon: ArrowRightLeft, label: 'Transf.' },
                    { id: 'Billetera', icon: Smartphone, label: 'Billetera' },
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                      className={cn(
                        "flex items-center gap-3 p-5 rounded-2xl border-2 transition-all active:scale-[0.98]",
                        selectedPaymentMethod === method.id
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none"
                          : "bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700"
                      )}
                    >
                      <method.icon className={cn("h-6 w-6", selectedPaymentMethod === method.id ? "text-white" : "text-indigo-500 dark:text-indigo-400")} />
                      <span className="text-xs font-black uppercase tracking-wider">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Fidelización de Clientes</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <input
                    id="loyalty-input"
                    type="text"
                    value={loyaltyId}
                    onChange={e => setLoyaltyId(e.target.value)}
                    className="w-full h-14 pl-14 pr-6 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl font-black text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 outline-none transition-all placeholder-slate-400"
                    placeholder="DNI o N° de Socio"
                  />
                </div>
                {currentCustomer && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/30 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                    <div>
                      <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Socio Detectado</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white">{currentCustomer.name}</p>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{currentCustomer.points || 0} pts disponibles</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      {rewards.filter((r: any) => (r.pointsCost || r.points || 0) <= (currentCustomer.points || 0)).map((prize: any) => (
                        <button
                          key={prize.id}
                          onClick={() => handleRedeem(prize)}
                          className="px-3 py-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2 text-[10px] font-black uppercase"
                        >
                          <Gift className="w-4 h-4" /> {prize.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-900 dark:bg-black rounded-[2.5rem] p-8 space-y-4 text-white shadow-2xl">
                <div className="flex justify-between items-center text-slate-400 font-bold text-xs uppercase tracking-widest px-2">
                  <span>Subtotal</span><span>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 font-bold text-xs uppercase tracking-widest px-2">
                  <span>Impuesto ({taxRate}%)</span><span>${taxes.toLocaleString()}</span>
                </div>
                <div className="h-px bg-slate-800 mx-2" />
                <div className="flex justify-between items-center px-2">
                  <div>
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Final</div>
                    <div className="text-4xl font-black">${total.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Puntos</div>
                    <div className="text-2xl font-black text-emerald-400">+{Math.floor(total / 10)} pts</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleProcessPayment}
                className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xl shadow-2xl shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center gap-4 transition-all"
              >
                CONFIRMAR PAGO <ArrowRight className="h-7 w-7" />
              </button>
            </div>
          </div>
        </div>
      )}

      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xl z-[500] flex items-center justify-center p-6" onClick={() => setIsScannerOpen(false)}>
          <div 
            className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-black text-xl text-slate-900 dark:text-white flex items-center gap-3">
                <Barcode className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> Escáner
              </h3>
              <button onClick={() => setIsScannerOpen(false)} className="p-2 text-slate-400 hover:bg-rose-50 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <input
                type="text"
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleBarcodeLookup(); }}
                placeholder="Escanea o escribe el código..."
                className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl font-black focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 outline-none transition-all placeholder-slate-400"
                autoFocus
              />
              <button
                onClick={handleBarcodeLookup}
                className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
              >
                Buscar Producto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
