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

  // FIX: búsqueda y filtro de categoría funcionales
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Todo');

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

  // FIX: escáner busca por barcode en los productos reales
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

  // FIX: usa closePOSOrder que guarda la venta correctamente
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
    <div className="h-[calc(100vh-64px)] p-6 grid grid-cols-12 gap-6 overflow-hidden">
      {/* Left Panel: Menu */}
      <section className="col-span-12 xl:col-span-8 flex flex-col gap-4 overflow-hidden max-h-full">
        {/* Search + Scanner + Order Type */}
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-medium outline-none bg-white"
              placeholder="Buscar por nombre o código de barras..."
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setBarcodeInput(''); setIsScannerOpen(true); }}
            className="h-12 px-4 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center gap-2 font-bold transition-colors"
          >
            <Barcode className="h-5 w-5" />
            Escanear
          </button>
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <button
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors",
                orderType === 'dine-in' ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"
              )}
              onClick={() => setOrderType('dine-in')}
            >
              <Utensils className="h-4 w-4" /> Mesa
            </button>
            <button
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors",
                orderType === 'takeaway' ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"
              )}
              onClick={() => setOrderType('takeaway')}
            >
              <ShoppingBag className="h-4 w-4" /> Llevar
            </button>
          </div>
        </div>

        {/* FIX: Filtros de categoría dinámicos y funcionales */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "whitespace-nowrap px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all",
                activeCategory === cat
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
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
                    "group bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-95 text-left flex flex-col min-h-[200px]",
                    inCart ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200"
                  )}
                >
                  <div className="h-28 bg-slate-100 overflow-hidden relative w-full shrink-0 flex items-center justify-center">
                    {(product as any).image ? (
                      <img src={(product as any).image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400">
                        <ShoppingBag className="w-8 h-8 opacity-40" />
                      </div>
                    )}
                    {product.popular && (
                      <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">POPULAR</div>
                    )}
                    {inCart && (
                      <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {inCart.qty}
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <h4 className="font-semibold text-sm leading-tight text-slate-800">{product.name}</h4>
                    <div className="mt-1 flex items-baseline gap-2">
                      <p className="text-indigo-600 font-bold text-sm">${currentPrice.toFixed(2)}</p>
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

      {/* Right Panel: Order */}
      <section className="col-span-12 xl:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col overflow-hidden max-h-full">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-xl text-slate-800">Pedido Actual</h3>
            <p className="text-sm text-slate-500">{orderType === 'dine-in' ? 'Pedido Rápido' : 'Para Llevar'}</p>
          </div>
          <button onClick={() => setCart([])} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
              <ShoppingBag className="w-12 h-12 mb-2" />
              <p className="text-sm font-medium">El carrito está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 shrink-0 flex items-center justify-center font-bold text-indigo-600 text-sm">
                  {item.qty}×
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-sm text-slate-800 truncate">{item.name}</h5>
                  <p className="text-xs text-slate-500">${(item.price * item.qty).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-white active:scale-95 text-slate-500">
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const prod = products.find(p => p.id?.toString() === item.id);
                      if (prod) addToCart(prod);
                    }}
                    className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0">
          <div className="space-y-2 mb-5">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Impuestos ({taxRate}%)</span><span>${taxes.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>
            {cart.length > 0 && (
              <div className="flex justify-between items-center bg-orange-50 p-3 rounded-xl mt-3 border border-orange-100">
                <span className="flex items-center gap-2 text-orange-700 font-bold text-sm">
                  <Clock className="w-4 h-4" /> Tiempo Estimado
                </span>
                <span className="font-black text-orange-700 text-lg">~{getEstimatedWaitTime()} min</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { addComanda('POS', cart); alert("Pedido enviado a cocina"); }}
              disabled={cart.length === 0}
              className="w-full h-14 bg-slate-900 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <ChefHat className="h-5 w-5" /> COCINA
            </button>
            <button
              onClick={() => setIsCheckoutModalOpen(true)}
              disabled={cart.length === 0}
              className="w-full h-14 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Wallet className="h-5 w-5" /> COBRAR
            </button>
          </div>
        </div>
      </section>

      {/* Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-2xl text-slate-900 tracking-tight">Cerrar Venta</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Selecciona el método y fidelización</p>
              </div>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="p-3 text-slate-400 hover:bg-white hover:text-rose-500 rounded-full transition-all">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="p-10 space-y-8 max-h-[78vh] overflow-y-auto">
              {/* Payment Methods */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Método de Pago</label>
                <div className="grid grid-cols-2 gap-3">
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
                        "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-[0.98]",
                        selectedPaymentMethod === method.id
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100"
                          : "bg-slate-50 border-transparent text-slate-600 hover:border-slate-200"
                      )}
                    >
                      <method.icon className={cn("h-5 w-5", selectedPaymentMethod === method.id ? "text-white" : "text-indigo-500")} />
                      <span className="text-xs font-black uppercase tracking-wider">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Loyalty */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fidelización de Clientes</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <input
                    id="loyalty-input"
                    type="text"
                    value={loyaltyId}
                    onChange={e => setLoyaltyId(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    placeholder="DNI o N° de Socio"
                  />
                </div>
                {currentCustomer && (
                  <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                    <div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Socio Detectado</p>
                      <p className="text-sm font-bold text-indigo-900">{currentCustomer.name}</p>
                      <p className="text-xs font-medium text-indigo-600">{currentCustomer.points || 0} pts disponibles</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      {rewards.filter((r: any) => (r.pointsCost || r.points || 0) <= (currentCustomer.points || 0)).map((prize: any) => (
                        <button
                          key={prize.id}
                          onClick={() => handleRedeem(prize)}
                          className="p-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100 flex items-center gap-1 text-[10px] font-black uppercase"
                        >
                          <Gift className="w-3 h-3" /> {prize.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Total Summary */}
              <div className="bg-slate-900 rounded-[2.5rem] p-8 space-y-4 text-white shadow-2xl">
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
                    <div className="text-xl font-black text-emerald-400">+{Math.floor(total / 10)} pts</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleProcessPayment}
                className="w-full h-16 bg-emerald-500 text-white rounded-2xl font-black text-lg shadow-2xl shadow-emerald-200 hover:bg-emerald-600 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              >
                FINALIZAR VENTA <ArrowRight className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIX: Scanner Modal con búsqueda real por código */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Barcode className="w-5 h-5 text-indigo-600" /> Escáner de Código
              </h3>
              <button onClick={() => setIsScannerOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 flex flex-col items-center text-center gap-6">
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center border-4 border-indigo-100">
                <Barcode className="w-12 h-12 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-800 mb-1">Lector de Código de Barras</h4>
                <p className="text-sm text-slate-500">Ingresá el código manualmente o usá el lector físico.</p>
              </div>
              <div className="w-full flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBarcodeLookup()}
                  className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 outline-none font-bold text-slate-900 focus:border-indigo-500 transition-all"
                  placeholder="Código de barras..."
                />
                <button
                  onClick={handleBarcodeLookup}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                >
                  Añadir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
