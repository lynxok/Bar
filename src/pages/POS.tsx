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
  CreditCard as ContactlessPayment,
  Clock,
  User,
  Phone,
  ArrowRightLeft
} from "lucide-react";
import { cn } from "../lib/utils";

const PRODUCTS = [
  {
    id: 1,
    name: "Gin Fizz de Verano",
    price: 14.50,
    takeawayPrice: 13.00,
    image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=400&q=80",
    popular: true
  },
  {
    id: 2,
    name: "Margherita DOC",
    price: 18.00,
    takeawayPrice: 16.50,
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: 3,
    name: "Pinta IPA Lúpulo",
    price: 9.00,
    takeawayPrice: 8.50,
    image: "https://images.unsplash.com/photo-1575037614876-c385cb80bc8f?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: 4,
    name: "Bowl Saludable",
    price: 16.50,
    takeawayPrice: 15.00,
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80"
  }
];

export function POS() {
  const [isTakeawayModalOpen, setIsTakeawayModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('dine-in');

  return (
    <div className="h-[calc(100vh-64px)] p-6 grid grid-cols-12 gap-6 overflow-hidden">
      {/* Left Panel: Menu */}
      <section className="col-span-12 xl:col-span-8 flex flex-col gap-6 overflow-hidden max-h-full">
        {/* Search */}
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input 
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent text-body-md font-body-md outline-none" 
              placeholder="Buscar por nombre o código..." 
              type="text" 
            />
          </div>
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="h-12 px-4 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center gap-2 font-bold transition-colors"
          >
            <Barcode className="h-5 w-5" />
            Escanear
          </button>
          <div className="flex bg-surface-container-low p-1 rounded-xl shadow-sm border border-slate-200">
            <button 
              className={cn(
                "px-4 py-2 rounded-lg text-label-caps font-label-caps flex items-center gap-2 transition-colors",
                orderType === 'dine-in' ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-200"
              )}
              onClick={() => setOrderType('dine-in')}
            >
              <Utensils className="h-4 w-4" /> Servicio de Mesa
            </button>
            <button 
              className={cn(
                "px-4 py-2 rounded-lg text-label-caps font-label-caps flex items-center gap-2 transition-colors",
                orderType === 'takeaway' ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-200"
              )}
              onClick={() => setOrderType('takeaway')}
            >
              <ShoppingBag className="h-4 w-4" /> Para Llevar
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide shrink-0">
          <button className="whitespace-nowrap px-6 py-2 bg-primary-container text-white rounded-full font-label-caps text-label-caps">Todo</button>
          <button className="whitespace-nowrap px-6 py-2 bg-white border border-slate-200 text-on-surface hover:bg-surface-container-high transition-colors rounded-full font-label-caps text-label-caps">Entradas</button>
          <button className="whitespace-nowrap px-6 py-2 bg-white border border-slate-200 text-on-surface hover:bg-surface-container-high transition-colors rounded-full font-label-caps text-label-caps">Platos Fuertes</button>
          <button className="whitespace-nowrap px-6 py-2 bg-white border border-slate-200 text-on-surface hover:bg-surface-container-high transition-colors rounded-full font-label-caps text-label-caps">Cervezas Artesanales</button>
          <button className="whitespace-nowrap px-6 py-2 bg-white border border-slate-200 text-on-surface hover:bg-surface-container-high transition-colors rounded-full font-label-caps text-label-caps">Cócteles</button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto pr-2 grid auto-rows-max grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
          {PRODUCTS.map(product => {
            const currentPrice = orderType === 'takeaway' ? product.takeawayPrice : product.price;
            return (
            <button key={product.id} className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-95 text-left flex flex-col min-h-[220px]">
              <div className="h-32 bg-slate-100 overflow-hidden relative w-full shrink-0">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {product.popular && (
                  <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    POPULAR
                  </div>
                )}
                {orderType === 'takeaway' && (
                  <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur text-white text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" /> TAKEAWAY
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
          )})}
        </div>
      </section>

      {/* Right Panel: Order */}
      <section className="col-span-12 xl:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col overflow-hidden max-h-full">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-xl text-slate-800">Pedido Actual</h3>
            <p className="text-sm text-slate-500">
              {orderType === 'dine-in' ? 'Pedido #842 • Mesa 12' : 'Pedido #843 • Para Llevar (Juan Pérez)'}
            </p>
          </div>
          <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          <div className="flex items-center gap-4 bg-surface-container-low p-3 rounded-xl border border-slate-100">
            <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 shrink-0 flex items-center justify-center font-bold text-primary">
              2x
            </div>
            <div className="flex-1">
              <h5 className="font-h3 text-[14px] text-on-surface">Gin Fizz de Verano</h5>
              <p className="text-body-md text-slate-500">Pedido #842</p>
            </div>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-white active:scale-95 text-slate-500">
                <Minus className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary-container active:scale-95">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0">
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-body-md text-primary font-medium mb-1">
              <span>Monto por persona (4)</span>
              <span>$15.19</span>
            </div>
            <div className="flex justify-between text-body-md text-on-surface-variant">
              <span>Subtotal</span>
              <span>$56.00</span>
            </div>
            <div className="flex justify-between text-body-md text-on-surface-variant">
              <span>Impuestos (8.5%)</span>
              <span>$4.76</span>
            </div>
            <div className="flex justify-between text-h2 font-h2 text-on-surface pt-2">
              <span>Total</span>
              <span>$60.76</span>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2 mb-4">
            <button className="flex flex-col items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-xl hover:border-primary hover:text-primary transition-all active:scale-95 shadow-sm text-slate-600">
              <Wallet className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Efectivo</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-xl hover:border-primary hover:text-primary transition-all active:scale-95 shadow-sm text-slate-600">
              <CreditCard className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Tarjeta</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-xl hover:border-primary hover:text-primary transition-all active:scale-95 shadow-sm text-slate-600">
              <ArrowRightLeft className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Transfer.</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-xl hover:border-primary hover:text-primary transition-all active:scale-95 shadow-sm text-slate-600">
              <ContactlessPayment className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Billetera</span>
            </button>
          </div>
          
          <button className="w-full h-14 bg-emerald-500 text-white text-lg font-bold rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
            Procesar Pago <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Barcode className="w-5 h-5 text-indigo-600" /> Escáner de Código de Barras
              </h3>
              <button 
                onClick={() => setIsScannerOpen(false)}
                className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 border-4 border-indigo-100">
                <Barcode className="w-12 h-12 text-indigo-600" />
              </div>
              
              <h4 className="text-lg font-bold text-slate-800 mb-2">Listo para escanear</h4>
              <p className="text-sm font-medium text-slate-500 mb-8">
                Utiliza tu lector físico de código de barras. El producto se añadirá automáticamente al pedido.
              </p>
              
              <div className="w-full flex gap-2">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="O ingresa el código manualmente..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                />
                <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition active:scale-95">
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
