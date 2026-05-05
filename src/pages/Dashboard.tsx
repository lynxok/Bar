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
  MonitorCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useStore } from "../contexts/StoreContext";


export function Dashboard() {
  const { tables, orders, products } = useStore();

  const performanceData = (() => {
    const daysLabels = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    const today = new Date();
    
    // Calcular el lunes de la semana actual
    const currentDay = today.getDay(); // 0=Dom, 1=Lun, ...
    const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday);
    
    const data = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayTotal = orders
        .filter(o => o.timestamp?.startsWith(dateStr))
        .reduce((sum, o) => sum + (o.total || 0), 0);
        
      data.push({ name: daysLabels[i], value: dayTotal });
    }
    return data;
  })();

  const totalSalesToday = orders
    .filter(o => o.timestamp?.startsWith(new Date().toISOString().split('T')[0]))
    .reduce((acc, o) => acc + (o.total || 0), 0);

  const activeTablesCount = tables.filter(t => t.status === 'occupied').length;
  const pendingOrdersCount = tables.filter(t => t.orderItems && t.orderItems.length > 0).length;
  const stockAlertsCount = products.filter(p => p.stock < 5).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Ventas Hoy</div>
            <div className="text-2xl font-bold text-slate-900">${totalSalesToday.toLocaleString()}</div>
            <div className="text-emerald-500 text-xs font-medium mt-2 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              Sincronizado
            </div>
          </div>
          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Ocupación</div>
            <div className="text-2xl font-bold text-slate-900">{activeTablesCount} / {tables.length}</div>
            <div className="text-slate-400 text-xs mt-2 flex items-center">
              <Users className="h-3 w-3 mr-1" />
              Mesas activas
            </div>
          </div>
          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Comandas en Curso</div>
            <div className="text-2xl font-bold text-slate-900">{pendingOrdersCount}</div>
            <div className="text-amber-500 text-xs mt-2 flex items-center font-medium">
              <Clock className="h-3 w-3 mr-1" />
              En preparación
            </div>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg text-amber-500">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Alertas Stock</div>
            <div className="text-2xl font-bold text-slate-900">{stockAlertsCount}</div>
            <div className="text-red-500 text-xs mt-2 flex items-center font-medium">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Revisar inventario
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
              <p className="text-sm font-medium text-slate-500">Histórico acumulado de ingresos</p>
            </div>
          </div>
          
          <div className="flex-1 min-h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 500}} 
                    dy={10} 
                    interval={0}
                    padding={{ left: 20, right: 20 }}
                  />
                  <YAxis hide={true} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1">
            <h3 className="font-bold text-slate-800 mb-6">Acciones Rápidas</h3>
            <div className="space-y-3">
              <Link to="/pos" className="w-full flex items-center justify-between p-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all group active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <MonitorCheck className="h-5 w-5" />
                  <span className="font-semibold text-sm">Venta Rápida (POS)</span>
                </div>
                <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link to="/mapa" className="w-full flex items-center justify-between p-4 border border-slate-200 text-slate-800 rounded-xl hover:bg-slate-50 transition-all group active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-indigo-500" />
                  <span className="font-semibold text-sm">Mapa de Mesas</span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </Link>

              <Link to="/finanzas" className="w-full flex items-center justify-between p-4 border border-slate-200 text-slate-800 rounded-xl hover:bg-slate-50 transition-all group active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <Receipt className="h-5 w-5 text-emerald-500" />
                  <span className="font-semibold text-sm">Ingresos/Gastos</span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </Link>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-white font-bold text-xs tracking-widest uppercase mb-1 opacity-60">SISTEMA</h4>
              <p className="text-white text-xl font-bold mb-4">Estado Operativo</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <p className="text-slate-400 text-xs">Vínculo con base de datos activo.</p>
              </div>
            </div>
            <Zap className="absolute -right-4 -bottom-4 h-32 w-32 text-indigo-500/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
