import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { Download, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';
import { useStore } from "../contexts/StoreContext";
import { cn } from "../lib/utils";
import * as XLSX from 'xlsx';

export function Analytics() {
  const { orders, expenses } = useStore();
  const [timeFilter, setTimeFilter] = useState('Hoy');

  // Determine date filter
  const getStartDate = () => {
    const now = new Date();
    if (timeFilter === 'Hoy') {
      return new Date(now.setHours(0,0,0,0));
    }
    if (timeFilter === 'Últimos 7 Días') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return new Date(d.setHours(0,0,0,0));
    }
    if (timeFilter === 'Este Mes') {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return new Date(0);
  };

  const startDate = getStartDate();

  // Filter real data
  const filteredOrders = useMemo(() => {
    return orders.filter(o => o.status === 'closed' && new Date(o.timestamp) >= startDate);
  }, [orders, startDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => new Date(e.date) >= startDate);
  }, [expenses, startDate]);

  // KPIs
  const totalSales = filteredOrders.reduce((acc, o) => acc + o.total, 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalSales - totalExpenses;
  const margin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  // Real Hourly Distribution (12:00 to 23:00)
  const hourlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const hourNum = 12 + i;
      const hour = `${hourNum}:00`;
      const salesForHour = filteredOrders.reduce((sum, o) => {
        const d = new Date(o.timestamp);
        if (d.getHours() === hourNum) {
          return sum + o.total;
        }
        return sum;
      }, 0);
      return { hour, sales: salesForHour };
    });
  }, [filteredOrders]);

  // Real Category Data from Order Items
  const categoryData = useMemo(() => {
    const categoryTotals = filteredOrders.reduce((acc, order) => {
      order.items?.forEach((item: any) => {
        const cat = item.category || 'Otros';
        acc[cat] = (acc[cat] || 0) + (item.price * item.qty);
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(categoryTotals)
      .map(name => ({ name, value: categoryTotals[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 categories
  }, [filteredOrders]);

  // Excel Export Handler
  const handleDownloadReport = () => {
    const reportData = filteredOrders.map(order => ({
      ID: order.id,
      Fecha: new Date(order.timestamp).toLocaleString(),
      Mesa: order.tableId,
      Total: order.total,
      Metodo_Pago: order.paymentMethod || 'Efectivo',
      Articulos_Vendidos: order.items?.map((i: any) => `${i.qty}x ${i.name}`).join(', ') || ''
    }));

    if (reportData.length === 0) {
      alert("No hay datos de ventas para este periodo.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte_Ventas");
    
    const fileName = `Reporte_Analitica_${timeFilter.replace(/ /g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="p-container-padding space-y-6 animate-in fade-in duration-700">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="font-bold text-[28px] text-slate-900 leading-tight mb-1">Analítica y Rendimiento</h1>
          <p className="text-slate-500 text-sm">Visualización avanzada de ventas y rentabilidad real.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
             <select 
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-lg px-4 py-2.5 pr-10 hover:bg-slate-100 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-indigo-600"
              >
               <option value="Hoy">Hoy</option>
               <option value="Últimos 7 Días">Últimos 7 Días</option>
               <option value="Este Mes">Este Mes</option>
             </select>
             <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button 
            onClick={handleDownloadReport}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg flex items-center gap-2 font-bold text-sm shadow-md hover:bg-indigo-700 transition-colors"
          >
            <Download className="w-4 h-4" /> Exportar a Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 relative z-10">Ingresos Brutos ({timeFilter})</p>
          <h3 className="text-[36px] font-bold text-slate-900 mb-2 relative z-10">${totalSales.toLocaleString()}</h3>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm relative z-10">
            <TrendingUp className="w-4 h-4" />
            <span>Basado en ventas cerradas</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 relative z-10">Gastos Directos ({timeFilter})</p>
          <h3 className="text-[36px] font-bold text-slate-900 mb-2 relative z-10">${totalExpenses.toLocaleString()}</h3>
          <div className="flex items-center gap-2 text-slate-500 font-bold text-sm relative z-10">
            <span className="text-indigo-600">Registro de egresos</span>
          </div>
        </div>

        <div className="bg-indigo-600 p-6 rounded-2xl shadow-xl relative overflow-hidden group text-white">
          <p className="text-indigo-100 font-bold text-xs uppercase tracking-wider mb-2 relative z-10">Utilidad Operativa</p>
          <h3 className="text-[36px] font-bold mb-2 relative z-10">${netProfit.toLocaleString()}</h3>
          <div className="flex items-center gap-2 font-bold text-sm relative z-10">
            <span className="bg-white/20 px-2 py-0.5 rounded flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> {margin.toFixed(1)}%
            </span>
            <span className="opacity-80">Rendimiento Actual</span>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="font-bold text-lg text-slate-800">Tendencia de Ventas (Horaria)</h3>
            <p className="text-slate-500 text-sm">Distribución de facturación en el rango de 12:00 a 23:00.</p>
          </div>
          <div className="flex-1 w-full h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ventas']}
                  />
                  <Bar dataKey="sales" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="font-bold text-lg text-slate-800">Mix de Ventas</h3>
            <p className="text-slate-500 text-sm">Desglose proporcional por categoría de productos (Top 5).</p>
          </div>
          <div className="flex-1 w-full h-[300px]">
             {categoryData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical">
                     <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                     <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                     <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12, fontWeight: 700}} width={80} />
                     <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
                     />
                     <Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]} barSize={24} />
                  </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">
                 No hay suficientes datos en este periodo.
               </div>
             )}
          </div>
        </div>

      </div>

    </div>
  );
}
