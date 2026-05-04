import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import { Download, Filter, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';

const hourlyData = [
  { hour: '12:00', sales: 400 },
  { hour: '13:00', sales: 800 },
  { hour: '14:00', sales: 1200 },
  { hour: '15:00', sales: 900 },
  { hour: '16:00', sales: 400 },
  { hour: '17:00', sales: 500 },
  { hour: '18:00', sales: 800 },
  { hour: '19:00', sales: 1500 },
  { hour: '20:00', sales: 2200 },
  { hour: '21:00', sales: 2500 },
  { hour: '22:00', sales: 2100 },
  { hour: '23:00', sales: 1200 },
];

const categoryData = [
  { name: 'Cervezas', value: 4500 },
  { name: 'Licores Fuertes', value: 3200 },
  { name: 'Entradas', value: 2800 },
  { name: 'Platos Principales', value: 5100 },
  { name: 'Postres / Café', value: 1200 },
];

export function Analytics() {
  return (
    <div className="p-container-padding space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="font-h1 text-[28px] text-on-surface leading-tight mb-1">Analítica y Rendimiento</h1>
          <p className="text-slate-500 text-sm">Visualización avanzada de ventas, rentabilidad y tendencias.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
             <select className="appearance-none bg-surface-container-low border border-slate-200 text-on-surface text-sm font-bold rounded-lg px-4 py-2.5 pr-10 hover:bg-slate-100 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-primary">
               <option>Últimos 30 Días</option>
               <option>Este Mes</option>
               <option>Mes Anterior</option>
               <option>Este Año</option>
             </select>
             <Calendar className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button className="px-4 py-2.5 bg-primary text-white rounded-lg flex items-center gap-2 font-bold text-sm shadow-md hover:bg-primary-container transition-colors">
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-teal-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 relative z-10">Ingresos Brutos</p>
          <h3 className="font-h1 text-[36px] text-on-surface mb-2 relative z-10">$ 42,850</h3>
          <div className="flex items-center gap-2 text-teal-600 font-bold text-sm relative z-10">
            <TrendingUp className="w-4 h-4" />
            <span>+14.2% vs periodo anterior</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 relative z-10">Costo de Ventas (COGS)</p>
          <h3 className="font-h1 text-[36px] text-on-surface mb-2 relative z-10">$ 14,200</h3>
          <div className="flex items-center gap-2 text-slate-500 font-bold text-sm relative z-10">
            <span className="text-orange-500">33%</span> del ingreso
          </div>
        </div>

        <div className="bg-primary p-6 rounded-2xl border border-primary-container shadow-md relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-tl-full"></div>
          <p className="text-primary-container font-bold text-xs uppercase tracking-wider mb-2 relative z-10">Margen de Beneficio</p>
          <h3 className="font-h1 text-[36px] text-white mb-2 relative z-10">$ 28,650</h3>
          <div className="flex items-center gap-2 text-white font-bold text-sm relative z-10">
            <span className="bg-white/20 px-2 py-0.5 rounded text-white flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> 67%
            </span>
            <span className="opacity-80 font-normal">Rentabilidad Alta</span>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Heatmap/Activity Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="font-h3 text-[18px] text-on-surface">Picos de Venta por Hora</h3>
            <p className="text-slate-500 text-sm">Distribución a lo largo del operativo de apertura.</p>
          </div>
          <div className="flex-1 w-full h-[300px]">
             <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="sales" fill="#00685f" radius={[4, 4, 0, 0]} />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="font-h3 text-[18px] text-on-surface">Ventas por Categoría</h3>
            <p className="text-slate-500 text-sm">Desglose de los artículos más rentables.</p>
          </div>
          <div className="flex-1 w-full h-[300px]">
             <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                   <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                   <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#0f172a', fontSize: 12, fontWeight: 600}} />
                   <Tooltip 
                      cursor={{fill: '#f1f5f9'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                   />
                   <Bar dataKey="value" fill="#fd761a" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
