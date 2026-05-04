import {
  TrendingUp,
  Users,
  Clock,
  AlertTriangle,
  ChevronRight,
  Receipt,
  Package,
  UserPlus,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const performanceData = [
  { name: "LUN", value: 3200 },
  { name: "MAR", value: 3800 },
  { name: "MIÉ", value: 2900 },
  { name: "JUE", value: 5000 },
  { name: "VIE", value: 4800 },
  { name: "SÁB", value: 6100 },
  { name: "DOM", value: 4200 },
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Ventas del Día</div>
            <div className="text-2xl font-bold text-slate-900">$4,285.50</div>
            <div className="text-emerald-500 text-xs font-medium mt-2 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12.5% vs ayer
            </div>
          </div>
          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Mesas Activas</div>
            <div className="text-2xl font-bold text-slate-900">18 / 24</div>
            <div className="text-slate-400 text-xs mt-2 flex items-center">
              <Users className="h-3 w-3 mr-1" />
              75% ocupación
            </div>
          </div>
          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Pedidos Pendientes</div>
            <div className="text-2xl font-bold text-slate-900">14</div>
            <div className="text-amber-500 text-xs mt-2 flex items-center font-medium">
              <Clock className="h-3 w-3 mr-1" />
              Espera media: 12 min
            </div>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg text-amber-500">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Alertas de Stock</div>
            <div className="text-2xl font-bold text-slate-900">06</div>
            <div className="text-red-500 text-xs mt-2 flex items-center font-medium">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Acción requerida
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-red-500">
            <Package className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sales Chart */}
        <div className="col-span-12 lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-slate-800">Resumen Semanal de Ventas</h3>
              <p className="text-sm font-medium text-slate-500">Rendimiento de los últimos 7 días</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                7 Días
              </button>
              <button className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                30 Días
              </button>
            </div>
          </div>
          
          <div className="flex-1 min-h-[300px]">
             <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 500}} dy={10} />
                  <YAxis hide={true} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions & Status */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1">
            <h3 className="font-bold text-slate-800 mb-6">Acciones Rápidas</h3>
            <div className="space-y-3">
              <Link to="/pos" className="w-full flex items-center justify-between p-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all group active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <MonitorCheck className="h-5 w-5" />
                  <span className="font-semibold text-sm">Abrir Terminal POS</span>
                </div>
                <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link to="/mapa" className="w-full flex items-center justify-between p-4 border border-slate-200 text-slate-800 rounded-xl hover:bg-slate-50 transition-all group active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-indigo-500" />
                  <span className="font-semibold text-sm">Gestionar Mesas</span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </Link>

              <Link to="/finanzas" className="w-full flex items-center justify-between p-4 border border-slate-200 text-slate-800 rounded-xl hover:bg-slate-50 transition-all group active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <Receipt className="h-5 w-5 text-amber-500" />
                  <span className="font-semibold text-sm">Registrar Gasto</span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </Link>
            </div>
          </div>

          {/* Operational Health Widget */}
          <div className="bg-slate-900 p-6 rounded-xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-white font-bold text-sm tracking-wide mb-1">ESTADO OPERATIVO</h4>
              <p className="text-white text-xl font-bold mb-4">Sistema Saludable</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <p className="text-slate-400 text-xs">Impresoras, Pantalla de Cocina y Nube en línea.</p>
              </div>
            </div>
            <Zap className="absolute -right-4 -bottom-4 h-32 w-32 text-indigo-500/20" />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-span-12 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Actividad Reciente</h3>
            <button className="text-indigo-600 text-xs font-bold hover:underline uppercase tracking-widest">Ver todo el registro</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-slate-100">
            <div className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Mesa 5 Facturada</p>
                  <p className="text-xs text-slate-400 mb-2">Pago completado por $142.00</p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded">ÉXITO</span>
                    <span className="text-[10px] text-slate-400">Hace 2 min</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Nuevo Stock Recibido</p>
                  <p className="text-xs text-slate-400 mb-2">Proveedor: Global Spirits Co.</p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-bold rounded">INVENTARIO</span>
                    <span className="text-[10px] text-slate-400">Hace 14 min</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Entrada de Personal</p>
                  <p className="text-xs text-slate-400 mb-2">Maria S. (Jefa de Sala)</p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded">PERSONAL</span>
                    <span className="text-[10px] text-slate-400">Hace 28 min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// Add MonitorCheck to lucide imports since it's used in the JSX
import { MonitorCheck } from "lucide-react";
