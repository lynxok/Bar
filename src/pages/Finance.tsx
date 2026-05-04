import {
  Wallet,
  Receipt,
  FileText,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertTriangle
} from "lucide-react";
import { cn } from "../lib/utils";

export function Finance() {
  return (
    <div className="p-container-padding space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="font-bold text-2xl text-slate-900 mb-2">Finanzas</h1>
          <p className="text-sm font-medium text-slate-500 max-w-2xl">
            Centro de control para facturación, cuentas por pagar y registro de gastos operativos diarios.
          </p>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wide text-slate-700 shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-500" />
            Nueva Factura Emitida
          </button>
          <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wide shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Registrar Gasto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: KPI & Expenses */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          
          <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800">
             <div className="flex items-center gap-3 mb-6 opacity-80">
               <Wallet className="w-6 h-6 text-indigo-400" />
               <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-300">FLUJO DE CAJA MENSUAL</h3>
             </div>
             <p className="text-sm font-bold text-slate-400 mb-1">Ingresos Proyectados</p>
             <h2 className="font-bold text-4xl text-white mb-6">$84,250.00</h2>
             
             <div className="space-y-4">
               <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                 <div className="flex items-center gap-2">
                   <div className="p-1 rounded bg-emerald-500/20 text-emerald-400"><ArrowUpRight className="w-4 h-4" /></div>
                   <span className="text-sm font-medium text-slate-300">Cobrado</span>
                 </div>
                 <span className="font-bold text-white">$52,100.00</span>
               </div>
               <div className="flex justify-between items-center pb-2">
                 <div className="flex items-center gap-2">
                   <div className="p-1 rounded bg-red-500/20 text-red-400"><ArrowDownRight className="w-4 h-4" /></div>
                   <span className="text-sm font-medium text-slate-300">Por Pagar</span>
                 </div>
                 <span className="font-bold text-red-400">$14,350.00</span>
               </div>
             </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800">Gastos Recientes</h3>
                <button className="text-indigo-600 text-xs font-bold uppercase tracking-widest hover:underline">Ver todos</button>
             </div>
             
             <div className="space-y-4">
               <div className="flex items-center gap-4 group cursor-pointer p-2 -mx-2 rounded-lg hover:bg-slate-50">
                 <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm">
                   <FileText className="w-6 h-6" />
                 </div>
                 <div className="flex-1">
                   <h4 className="font-bold text-sm text-on-surface mb-0.5">Global Spirits Co.</h4>
                   <p className="text-xs text-slate-500">Reposición Licores • Hace 2 min</p>
                 </div>
                 <div className="text-right">
                   <span className="font-bold text-error">-$1,420.00</span>
                 </div>
               </div>
               
               <div className="flex items-center gap-4 group cursor-pointer p-2 -mx-2 rounded-lg hover:bg-slate-50">
                 <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm">
                   <FileText className="w-6 h-6" />
                 </div>
                 <div className="flex-1">
                   <h4 className="font-bold text-sm text-on-surface mb-0.5">Mercado Central</h4>
                   <p className="text-xs text-slate-500">Verduras y Frescos • Ayer</p>
                 </div>
                 <div className="text-right">
                   <span className="font-bold text-error">-$385.50</span>
                 </div>
               </div>
               
               <div className="flex items-center gap-4 group cursor-pointer p-2 -mx-2 rounded-lg hover:bg-slate-50">
                 <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm">
                   <FileText className="w-6 h-6" />
                 </div>
                 <div className="flex-1">
                   <h4 className="font-bold text-sm text-on-surface mb-0.5">Servicio Eléctrico</h4>
                   <p className="text-xs text-slate-500">Factura de Luz • 14 Mar</p>
                 </div>
                 <div className="text-right">
                   <span className="font-bold text-error">-$842.00</span>
                 </div>
               </div>
             </div>
          </div>
        </div>

        {/* Right Col: Invoices Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <h3 className="font-bold text-slate-800">Facturas y Cuentas por Cobrar</h3>
             <div className="flex items-center gap-3">
                <div className="relative">
                  <select className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent">
                    <option>Cualquier Estado</option>
                    <option>Pendiente</option>
                    <option>Pagado</option>
                    <option>Vencido</option>
                  </select>
                  <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
             </div>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500">ID FACTURA</th>
                  <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500">FECHA</th>
                  <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500">CLIENTE / REFERENCIA</th>
                  <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500 text-right">MONTO</th>
                  <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500">ESTADO</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50 transition-colors cursor-pointer group">
                  <td className="px-6 py-4 text-sm font-bold text-on-surface">INV-2024-0842</td>
                  <td className="px-6 py-4 text-sm text-slate-500">18 Mar, 2024</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-on-surface">Tech Event Co.</p>
                    <p className="text-xs text-slate-400">Reserva de Salón Privado</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-on-surface text-right">$2,450.00</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
                      <Clock className="w-3.5 h-3.5" /> Pendiente
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-primary transition-colors"><MoreVertical className="w-5 h-5" /></button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50 transition-colors cursor-pointer group">
                  <td className="px-6 py-4 text-sm font-bold text-on-surface">INV-2024-0841</td>
                  <td className="px-6 py-4 text-sm text-slate-500">15 Mar, 2024</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-on-surface">Comida Corporativa SA</p>
                    <p className="text-xs text-slate-400">Desayuno Ejecutivo</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-on-surface text-right">$850.00</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Pagado
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-primary transition-colors"><MoreVertical className="w-5 h-5" /></button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50 transition-colors cursor-pointer group bg-red-50/30">
                  <td className="px-6 py-4 text-sm font-bold text-on-surface">INV-2024-0839</td>
                  <td className="px-6 py-4 text-sm text-error font-medium">01 Mar, 2024</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-on-surface">Local Business LLC</p>
                    <p className="text-xs text-slate-400">Cumpleaños Empleados</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-on-surface text-right">$1,120.00</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5" /> Vencido
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-primary transition-colors"><MoreVertical className="w-5 h-5" /></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
