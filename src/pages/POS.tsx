import { useState } from "react";
import { computeTotals, taxLabel } from '../lib/pricing';
import { maybeAutoPrintTicket } from '../lib/printing';
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
  Beer,
} from "lucide-react";
import { MugFillModal } from '../components/mugs/MugFillModal';
import { useStore } from "../contexts/StoreContext";
import { useBusiness } from "../contexts/BusinessContext";
import { cn } from "../lib/utils";
import { LoggerService } from "../lib/LoggerService";
import { formatMoney } from "../lib/format";
import { useToast } from "../components/ui/Toast";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/StatusBadge";
import { EmptyState } from "../components/ui/EmptyState";


export function POS() {
  const { showToast } = useToast();
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

  const { taxRate, pricesIncludeTax } = useBusiness();
  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number; [k: string]: any }[]>([]);
  const [isMugFillOpen, setIsMugFillOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Efectivo');
  const [loyaltyId, setLoyaltyId] = useState('');
  const [tipInput, setTipInput] = useState('');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('dine-in');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');

  // Búsqueda y filtro de categoría funcionales
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
      return [...prev, { id: product.id.toString(), productId: product.id, name: product.name, price: currentPrice, qty: 1 }];
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
      showToast(`No se encontró producto con código "${barcodeInput}".`, "warning");
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
  const { tax: taxes, total } = computeTotals(subtotal, { taxRate, pricesIncludeTax });

  const handleProcessPayment = async () => {
    if (cart.length === 0) return;
    try {
      await closePOSOrder(cart, total, selectedPaymentMethod, { customerDni: loyaltyId || undefined, tip: Number(tipInput) || 0 });
      maybeAutoPrintTicket({
        title: 'Mostrador', items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
        subtotal, taxLabel: taxLabel({ taxRate, pricesIncludeTax }), tax: taxes, total,
        tip: Number(tipInput) || 0, paymentMethod: selectedPaymentMethod,
      }).catch(() => {});
      await LoggerService.audit('SALE', 'POS', `Venta rápida: $${total.toFixed(2)} (${selectedPaymentMethod})`);
      setCart([]);
      setLoyaltyId('');
      setTipInput('');
      setIsCheckoutModalOpen(false);
    } catch (err: any) {
      showToast(`Error al procesar el pago: ${err.message}`, "error");
    }
  };

  const currentCustomer = customers.find(c => c.dni === loyaltyId || c.id?.toString() === loyaltyId);

  const handleRedeem = async (prize: any) => {
    if (!currentCustomer) return;
    try {
      await redeemPoints(currentCustomer.dni, prize.pointsCost, `Canje Recompensa POS: ${prize.name}`);
      showToast(`Recompensa "${prize.name}" canjeada con éxito.`, "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] p-6 grid grid-cols-12 gap-6 overflow-hidden bg-surface-container-low text-on-surface">
      <section className="col-span-12 xl:col-span-8 flex flex-col gap-4 overflow-hidden max-h-full">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant h-5 w-5" />
            <input
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium outline-none bg-surface-container-lowest text-on-surface placeholder-slate-400"
              placeholder="Buscar por nombre o código de barras..."
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setBarcodeInput(''); setIsScannerOpen(true); }}
            className="h-12 px-4 bg-surface-container-lowest text-on-surface hover:bg-surface-container border border-outline-variant rounded-xl flex items-center gap-2 font-bold transition-all active:scale-95"
          >
            <Barcode className="h-5 w-5" />
            Escanear
          </button>
          <button
            onClick={() => setIsMugFillOpen(true)}
            className="h-12 px-4 bg-surface-container-lowest text-on-surface hover:bg-surface-container border border-outline-variant rounded-xl flex items-center gap-2 font-bold whitespace-nowrap shrink-0 transition-all active:scale-95"
          >
            <Beer className="h-5 w-5" />
            Recarga de vaso
          </button>
          <div className="flex bg-surface-container p-1 rounded-xl shadow-sm border border-outline-variant">
            <button
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all",
                orderType === 'dine-in' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-low"
              )}
              onClick={() => setOrderType('dine-in')}
            >
              <Utensils className="h-4 w-4" /> Mesa
            </button>
            <button
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all",
                orderType === 'takeaway' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-low"
              )}
              onClick={() => setOrderType('takeaway')}
            >
              <ShoppingBag className="h-4 w-4" /> Llevar
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "whitespace-nowrap px-5 h-11 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center border",
                activeCategory === cat
                  ? "bg-primary text-on-primary shadow-md border-transparent"
                  : "bg-surface-container-lowest border-outline-variant text-on-surface hover:bg-surface-container-low"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-1 grid auto-rows-max grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-4 py-8">
              <EmptyState
                icon={<Search className="w-8 h-8" />}
                title={`Sin resultados para "${searchQuery}"`}
                description="Intentá buscar por otro término o cambiá de categoría."
              />
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
                    "group bg-surface-container-lowest border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-95 text-left flex flex-col min-h-[200px]",
                    inCart ? "border-primary ring-2 ring-primary/20" : "border-outline-variant"
                  )}
                >
                  <div className="h-28 bg-surface-container-low overflow-hidden relative w-full shrink-0 flex items-center justify-center border-b border-outline-variant">
                    {(product as any).image ? (
                      <img src={(product as any).image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                        <ShoppingBag className="w-8 h-8 opacity-40" />
                      </div>
                    )}
                    {product.popular && (
                      <div className="absolute top-2 right-2 bg-primary text-on-primary text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">Popular</div>
                    )}
                    {inCart && (
                      <div className="absolute top-2 left-2 bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm">
                        <CheckCircle2 className="w-3 h-3" /> {inCart.qty}
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <h4 className="font-bold text-sm leading-tight text-on-surface">{product.name}</h4>
                    <div className="mt-1 flex items-baseline gap-2">
                      <p className="text-emerald-600 font-bold text-sm tabular-nums">{formatMoney(currentPrice)}</p>
                      {orderType === 'takeaway' && (
                        <p className="text-on-surface-variant font-medium text-xs line-through tabular-nums">{formatMoney(product.price)}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="col-span-12 xl:col-span-4 bg-surface-container-lowest border border-outline rounded-2xl shadow-sm flex flex-col overflow-hidden max-h-full">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low shrink-0">
          <div>
            <h3 className="font-bold text-xl text-on-surface">Pedido Actual</h3>
            <p className="text-sm text-on-surface-variant">{orderType === 'dine-in' ? 'Pedido Rápido' : 'Para Llevar'}</p>
          </div>
          <button onClick={() => setCart([])} className="h-11 w-11 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-95" title="Vaciar carrito">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-50">
              <ShoppingBag className="w-12 h-12 mb-2" />
              <p className="text-sm font-medium">El carrito está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-surface-container border border-outline-variant shrink-0 flex items-center justify-center font-bold text-primary text-sm tabular-nums">
                  {item.qty}×
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-sm text-on-surface truncate">{item.name}</h5>
                  <p className="text-xs text-on-surface-variant tabular-nums">{formatMoney(item.price * item.qty)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => removeFromCart(item.id)} className="h-11 w-11 rounded-xl border border-outline-variant bg-surface-container flex items-center justify-center hover:bg-surface-container-high active:scale-95 text-on-surface-variant shadow-sm transition-all">
                    <Minus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      const prod = products.find(p => p.id?.toString() === item.id);
                      if (prod) addToCart(prod);
                    }}
                    className="h-11 w-11 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:opacity-90 active:scale-95 shadow-md transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-surface-container-low border-t border-outline shrink-0">
          <div className="space-y-2 mb-5">
            <div className="flex justify-between text-sm text-on-surface-variant tabular-nums">
              <span>Subtotal</span><span>{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-on-surface-variant tabular-nums">
              <span>{taxLabel({ taxRate, pricesIncludeTax })}</span><span>{formatMoney(taxes)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-on-surface pt-2 border-t border-outline-variant tabular-nums">
              <span>Total</span><span>{formatMoney(total)}</span>
            </div>

            {cart.length > 0 && (
              <div className="flex justify-between items-center bg-amber-500/10 p-3 rounded-xl mt-3 border border-amber-500/20">
                <span className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                  <Clock className="w-4 h-4" /> Tiempo Estimado
                </span>
                <span className="font-black text-amber-650 text-lg">~{getEstimatedWaitTime()} min</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => { addComanda('POS', cart); showToast('Pedido enviado a cocina', 'success'); }}
              disabled={cart.length === 0}
              className="h-14 font-semibold"
            >
              <ChefHat className="h-5 w-5 text-brand dark:text-emerald-400" /> Cocina
            </Button>
            <Button
              variant="accent"
              size="lg"
              onClick={() => setIsCheckoutModalOpen(true)}
              disabled={cart.length === 0}
              className="h-14 font-bold"
            >
              <Wallet className="h-5 w-5" /> Cobrar
            </Button>
          </div>
        </div>
      </section>

      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[200] flex items-center justify-center p-6">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-outline animate-in zoom-in-95 duration-200 text-on-surface">
            <div className="px-8 py-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <div>
                <h3 className="font-bold text-2xl text-on-surface tracking-tight">Cerrar Venta</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-1">Selecciona el método y fidelización</p>
              </div>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="p-2 text-on-surface-variant hover:bg-surface-container hover:text-rose-600 rounded-lg transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="space-y-4">
                <label className="text-xs font-semibold text-on-surface-variant ml-1">Método de Pago</label>
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
                        "flex items-center gap-3 p-4 rounded-xl border transition-all active:scale-[0.98]",
                        selectedPaymentMethod === method.id
                          ? "bg-primary border-primary text-on-primary shadow-md"
                          : "bg-surface-container border-outline-variant text-on-surface hover:border-outline"
                      )}
                    >
                      <method.icon className={cn("h-5 w-5", selectedPaymentMethod === method.id ? "text-on-primary" : "text-primary")} />
                      <span className="text-xs font-semibold">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-semibold text-on-surface-variant ml-1">Fidelización de Clientes</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant h-5 w-5" />
                  <input
                    id="loyalty-input"
                    type="text"
                    value={loyaltyId}
                    onChange={e => setLoyaltyId(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 bg-white border border-outline-variant rounded-xl font-bold text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-slate-400"
                    placeholder="DNI o N° de Socio"
                  />
                </div>
                {currentCustomer && (
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                    <div>
                      <p className="text-xs font-bold text-primary">Socio Detectado</p>
                      <p className="text-sm font-bold text-on-surface">{currentCustomer.name}</p>
                      <p className="text-xs font-medium text-on-surface-variant">{currentCustomer.points || 0} pts disponibles</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      {rewards.filter((r: any) => (r.pointsCost || r.points || 0) <= (currentCustomer.points || 0)).map((prize: any) => (
                        <button
                          key={prize.id}
                          onClick={() => handleRedeem(prize)}
                          className="p-2 bg-surface-container-high text-primary rounded-lg hover:bg-primary hover:text-on-primary transition-all shadow-sm border border-outline flex items-center gap-1 text-xs font-semibold"
                        >
                          <Gift className="w-3.5 h-3.5" /> {prize.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-surface-container rounded-2xl p-6 space-y-4 text-on-surface border border-outline-variant shadow-sm">
                <div className="flex justify-between items-center text-on-surface-variant font-semibold text-xs px-2">
                  <span>Subtotal</span><span className="tabular-nums">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-on-surface-variant font-semibold text-xs px-2">
                  <span>{taxLabel({ taxRate, pricesIncludeTax })}</span><span className="tabular-nums">{formatMoney(taxes)}</span>
                </div>
                <div className="h-px bg-outline-variant mx-2" />
                <div className="flex justify-between items-center px-2">
                  <div>
                    <div className="text-xs font-semibold text-primary mb-1">Total Final</div>
                    <div className="text-4xl font-black tabular-nums">{formatMoney(total)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-emerald-600 mb-1">Puntos</div>
                    <div className="text-xl font-bold text-emerald-600">+{Math.floor(total / 100)} pts</div>
                  </div>
                </div>
              </div>


              <label className="block space-y-1">
                <span className="text-xs font-semibold text-on-surface-variant">Propina ($, se registra aparte)</span>
                <input type="number" min={0} value={tipInput} onChange={e => setTipInput(e.target.value)} placeholder="0"
                  className="w-full h-11 px-3 rounded-xl border border-outline-variant bg-surface font-bold outline-none focus:border-primary" />
              </label>

              <button
                onClick={handleProcessPayment}
                className="w-full h-16 bg-emerald-600 hover:opacity-90 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-3 transition-all cursor-pointer"
              >
                FINALIZAR VENTA <ArrowRight className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      <MugFillModal isOpen={isMugFillOpen} onClose={() => setIsMugFillOpen(false)} onAdd={item => setCart(prev => [...prev, item])} />
      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-outline text-on-surface">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-bold text-lg text-on-surface flex items-center gap-2">
                <Barcode className="w-5 h-5 text-primary" /> Escáner de Código
              </h3>
              <button onClick={() => setIsScannerOpen(false)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="text"
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleBarcodeLookup(); }}
                placeholder="Escanea o escribe el código de barras..."
                className="w-full h-12 px-4 bg-white border border-outline-variant rounded-xl font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-slate-400"
                autoFocus
              />
              <button
                onClick={handleBarcodeLookup}
                className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold shadow-md hover:opacity-90 active:scale-95 transition-all"
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
