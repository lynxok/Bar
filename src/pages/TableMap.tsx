import { useState } from "react";
import { UtensilsCrossed, Circle, Square, MapPin, X, Plus, Minus, Search, ShoppingCart, Save, MousePointer2, Move, Type, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";

const MENU_ITEMS = [
  { id: '1', name: 'Burger Simple', price: 1200, category: 'Comida' },
  { id: '2', name: 'Burger Doble', price: 1500, category: 'Comida' },
  { id: '3', name: 'Papas Fritas', price: 600, category: 'Acompañamiento' },
  { id: '4', name: 'Gaseosa Cola', price: 400, category: 'Bebida' },
  { id: '5', name: 'Cerveza IPA', price: 800, category: 'Bebida' },
  { id: '6', name: 'Ensalada César', price: 1100, category: 'Comida' },
];

export function TableMap() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [orderItems, setOrderItems] = useState<{id: string, name: string, price: number, qty: number}[]>([]);

  const handleAddItem = (item: any) => {
    setOrderItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const handleRemoveItem = (id: string) => {
    setOrderItems(prev => {
      const exists = prev.find(i => i.id === id);
      if (exists && exists.qty > 1) {
        return prev.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const total = orderItems.reduce((acc, item) => acc + (item.price * item.qty), 0);

  return (
    <div className="h-[calc(100vh-64px)] flex relative overflow-hidden bg-surface">
      <div className="flex-1 p-container-padding flex flex-col relative overflow-hidden">
        
        <div className="mb-6 flex justify-between items-end shrink-0">
          <div>
            <h2 className="font-bold text-lg text-slate-800">Salón Principal</h2>
            <p className="text-sm text-slate-500 flex items-center gap-2 mt-1 font-medium">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span> 
              12 Mesas Ocupadas / 8 Disponibles
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              onClick={() => setIsEditingLayout(true)}
            >
              <UtensilsCrossed className="w-5 h-5" />
              Editar Diseño
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200">
              <span className="text-lg leading-none">+</span> Nueva Reserva
            </button>
          </div>
        </div>

        {/* Floor Plan Grid Canvas */}
        <div 
          className="flex-1 w-full bg-slate-50 rounded-xl border border-dashed border-slate-300 relative overflow-hidden" 
          style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        >
          {/* Table Row 1 */}
          <div className="absolute top-[80px] left-[100px] group cursor-pointer" onClick={() => setSelectedTable('T-01')}>
            <div className="w-20 h-20 bg-emerald-400 border-2 border-emerald-500 rounded-full flex flex-col items-center justify-center hover:scale-105 transition-transform shadow-md">
              <span className="text-xs font-bold text-white">T-01</span>
              <Circle className="text-white/50 h-8 w-8" />
              <div className="mt-1 flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
            </div>
            <span className="absolute -top-2 -right-2 bg-white border border-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">45m</span>
          </div>

          <div className="absolute top-[80px] left-[260px] group cursor-pointer" onClick={() => setSelectedTable('T-02')}>
            <div className="w-20 h-20 bg-white border-2 border-slate-200 rounded-full flex flex-col items-center justify-center hover:border-emerald-400 transition-all shadow-sm">
              <span className="text-xs font-bold text-slate-400">T-02</span>
              <Circle className="text-slate-200 h-8 w-8" />
              <p className="text-[9px] text-slate-400 mt-1">Available</p>
            </div>
          </div>

          <div className="absolute top-[80px] left-[420px] group cursor-pointer" onClick={() => setSelectedTable('T-03')}>
            <div className="w-32 h-20 bg-red-400 border-2 border-red-500 rounded-lg flex flex-col items-center justify-center hover:scale-105 transition-transform shadow-md">
              <span className="text-xs font-bold text-white">T-03</span>
              <div className="flex gap-2 items-center mt-1">
                 <div className="w-2 h-2 rounded-full bg-white"></div>
                 <div className="w-2 h-2 rounded-full bg-white"></div>
                 <div className="w-2 h-2 rounded-full bg-white"></div>
                 <div className="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </div>
            <span className="absolute -top-2 -right-2 bg-amber-400 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm uppercase">Checkout</span>
          </div>

          {/* Table Row 2 */}
          <div className="absolute top-[240px] left-[100px] group cursor-pointer" onClick={() => setSelectedTable('T-04')}>
            <div className="w-24 h-24 bg-white border-2 border-slate-200 rounded-lg flex flex-col items-center justify-center hover:border-emerald-400 transition-all shadow-sm">
              <span className="text-xs font-bold text-slate-400">T-04</span>
              <Square className="text-slate-200 h-10 w-10" />
              <p className="text-[9px] text-slate-400 mt-1">Available</p>
            </div>
          </div>

          <div className="absolute top-[240px] left-[280px] group cursor-pointer ring-4 ring-red-200 ring-offset-2 rounded-lg" onClick={() => setSelectedTable('T-05')}>
            <div className="w-32 h-32 bg-red-400 border-2 border-red-500 flex flex-col items-center justify-center shadow-lg transition-transform">
              <span className="text-sm font-bold text-white">T-05</span>
              <Square className="text-white/50 h-12 w-12" />
              <div className="mt-2 flex gap-1">
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <div className="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </div>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-3 py-1 rounded shadow-lg whitespace-nowrap font-bold">
              $7,120
            </div>
          </div>

          {/* Bar Area */}
          <div className="absolute top-[40px] right-[80px] w-[140px] h-[400px] bg-white rounded-l-3xl border-l border-y border-slate-300 shadow-sm flex flex-col items-center justify-around py-8">
            <div className="rotate-90 text-[10px] font-bold text-slate-400 tracking-widest whitespace-nowrap -ml-4 uppercase">
              Asientos Bar
            </div>
            <div className="flex flex-col gap-4 z-10 w-full items-end pr-8 mt-[-80px]">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-500 bg-emerald-50 flex items-center justify-center shadow-sm">
                <span className="text-[10px] font-bold text-emerald-600">S1</span>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-emerald-500 bg-emerald-50 flex items-center justify-center shadow-sm">
                <span className="text-[10px] font-bold text-emerald-600">S2</span>
              </div>
              <div className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center shadow-sm">
                <span className="text-[10px] font-bold text-slate-400">S3</span>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-emerald-500 bg-emerald-50 flex items-center justify-center shadow-sm">
                <span className="text-[10px] font-bold text-emerald-600">S4</span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md p-4 rounded-xl border border-slate-200 flex gap-6 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-400"></div>
              <span className="text-xs font-semibold text-slate-700">Libre</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-400"></div>
              <span className="text-xs font-semibold text-slate-700">Ocupada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-400"></div>
              <span className="text-xs font-semibold text-slate-700">Pendiente de Cobro</span>
            </div>
          </div>
        </div>
      </div>

      {/* POS Modal */}
      {selectedTable && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex overflow-hidden border border-slate-200" onClick={(e) => e.stopPropagation()}>
            
            {/* Menu Catalog */}
            <div className="w-2/3 bg-slate-50 flex flex-col border-r border-slate-200">
              <div className="p-6 bg-white border-b border-slate-200">
                <h3 className="font-bold text-xl text-slate-800">Menú</h3>
                <div className="mt-4 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="text" 
                    placeholder="Buscar platos, bebidas, etc..." 
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {MENU_ITEMS.map((item) => (
                    <button 
                      key={item.id}
                      onClick={() => handleAddItem(item)}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all text-left group active:scale-95 flex flex-col justify-between min-h-[140px]"
                    >
                       <div>
                         <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">{item.category}</div>
                         <div className="font-bold text-slate-800 leading-tight mb-2">{item.name}</div>
                       </div>
                       <div className="text-indigo-600 font-bold text-lg">${item.price}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Current Order */}
            <div className="w-1/3 bg-white flex flex-col relative">
              <button 
                onClick={() => { setSelectedTable(null); setOrderItems([]); }}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="p-6 border-b border-slate-100">
                 <h3 className="font-bold text-2xl text-slate-900 mb-1 pt-2">Mesa {selectedTable}</h3>
                 <p className="text-sm text-slate-500 font-medium">Ticket Pendiente</p>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {orderItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                      <ShoppingCart className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="font-medium text-sm text-slate-500">Sin items en la orden</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {orderItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center group">
                         <div className="flex-1">
                           <div className="font-semibold text-slate-800 text-sm mb-1">{item.name}</div>
                           <div className="text-slate-500 text-xs font-medium">${item.price} c/u</div>
                         </div>
                         <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1 border border-slate-100">
                           <button 
                             onClick={() => handleRemoveItem(item.id)}
                             className="w-8 h-8 rounded-lg bg-white text-slate-600 flex items-center justify-center hover:text-red-500 hover:shadow-sm transition-all"
                           >
                             <Minus className="w-4 h-4" />
                           </button>
                           <span className="font-bold text-slate-800 w-4 text-center text-sm">{item.qty}</span>
                           <button 
                             onClick={() => handleAddItem(item)}
                             className="w-8 h-8 rounded-lg bg-white text-slate-600 flex items-center justify-center hover:text-indigo-600 hover:shadow-sm transition-all"
                           >
                             <Plus className="w-4 h-4" />
                           </button>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 mt-auto">
                 <div className="flex justify-between items-center mb-6">
                   <span className="text-slate-500 font-bold uppercase tracking-wider text-xs">Total a Cobrar</span>
                   <span className="text-3xl font-bold text-slate-900">${total.toLocaleString()}</span>
                 </div>
                 <button 
                   className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                   disabled={orderItems.length === 0}
                   onClick={() => {
                     // Lógica de confirmación
                     setSelectedTable(null);
                     setOrderItems([]);
                   }}
                 >
                   Confirmar Pedido
                 </button>
              </div>
            </div>

          </div>
        </div>
      )}
      {/* Edit Layout Modal */}
      {isEditingLayout && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex overflow-hidden border border-slate-200" onClick={(e) => e.stopPropagation()}>
            
            {/* Sidebar Toolbox */}
            <div className="w-1/4 bg-slate-50 border-r border-slate-200 flex flex-col">
              <div className="p-6 border-b border-slate-200 bg-white">
                <h3 className="font-bold text-lg text-slate-800">Herramientas</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Arrastra para agregar al plano</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Mesas</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-grab shadow-sm hover:border-indigo-400 transition-colors">
                      <Circle className="w-8 h-8 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-600">Redonda</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-grab shadow-sm hover:border-indigo-400 transition-colors">
                      <Square className="w-8 h-8 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-600">Cuadrada</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Estructura</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-grab shadow-sm hover:border-indigo-400 transition-colors">
                      <div className="w-8 h-8 flex items-center justify-center border-l-4 border-slate-400" />
                      <span className="text-xs font-semibold text-slate-600">Pared</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-grab shadow-sm hover:border-indigo-400 transition-colors">
                      <div className="w-8 h-8 border-2 border-slate-400 rounded-md" />
                      <span className="text-xs font-semibold text-slate-600">Barra</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 bg-white">
                <button className="w-full py-3 bg-white border border-red-200 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Limpiar Plano
                </button>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 flex flex-col bg-slate-100 relative">
              <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button className="p-2 bg-white rounded shadow-sm text-indigo-600"><MousePointer2 className="w-4 h-4" /></button>
                  <button className="p-2 text-slate-500 hover:text-slate-800"><Move className="w-4 h-4" /></button>
                  <button className="p-2 text-slate-500 hover:text-slate-800"><Type className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-500">Zoom: 100%</span>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                    <button className="p-1.5 text-slate-500 hover:text-slate-800"><Minus className="w-4 h-4" /></button>
                    <button className="p-1.5 text-slate-500 hover:text-slate-800"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              {/* Wireframe Map */}
              <div 
                className="flex-1 relative overflow-auto m-6 bg-white border border-slate-300 shadow-sm rounded-xl"
                style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
              >
                 <div className="absolute top-[80px] left-[100px] w-20 h-20 border-2 border-indigo-500 border-dashed rounded-full flex items-center justify-center bg-indigo-50/50 cursor-move">
                    <span className="text-indigo-600 font-bold text-xs">T-01</span>
                 </div>
                 <div className="absolute top-[80px] left-[260px] w-20 h-20 border-2 border-slate-400 border-solid rounded-full flex items-center justify-center bg-white cursor-move hover:border-indigo-400 transition-colors">
                    <span className="text-slate-400 font-bold text-xs">T-02</span>
                 </div>
                 <div className="absolute top-[80px] left-[420px] w-32 h-20 border-2 border-slate-400 border-solid rounded-lg flex items-center justify-center bg-white cursor-move hover:border-indigo-400 transition-colors">
                    <span className="text-slate-400 font-bold text-xs">T-03</span>
                 </div>
              </div>
            </div>

            {/* Properties Panel (Right) */}
            <div className="w-1/4 bg-white border-l border-slate-200 flex flex-col">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white">
                <h3 className="font-bold text-lg text-slate-800">Propiedades</h3>
                <button onClick={() => setIsEditingLayout(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Identificador</label>
                  <input type="text" defaultValue="T-01" className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium" readOnly />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Capacidad (Sillas)</label>
                  <div className="flex items-center gap-3">
                    <button className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50"><Minus className="w-4 h-4 text-slate-600" /></button>
                    <span className="font-bold text-slate-800 text-lg">2</span>
                    <button className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50"><Plus className="w-4 h-4 text-slate-600" /></button>
                  </div>
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Estado Default</label>
                   <select className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium appearance-none">
                     <option>Activa</option>
                     <option>Bloqueada</option>
                     <option>VIP</option>
                   </select>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-3">
                <button 
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                  onClick={() => setIsEditingLayout(false)}
                >
                  <Save className="w-4 h-4" />
                  Guardar Cambios
                </button>
                <button 
                  className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                  onClick={() => setIsEditingLayout(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
