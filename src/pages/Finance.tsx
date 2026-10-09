import React, { useState } from "react";
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
  AlertTriangle,
  X,
  CreditCard,
  Banknote,
  Tag,
  Calendar,
  Download
} from "lucide-react";
import { cn } from "../lib/utils";
import { useStore } from "../contexts/StoreContext";
import { formatMoney } from "../lib/format";
import * as XLSX from 'xlsx';


const EXPENSE_CATEGORIES = [
  'Insumos / Mercadería',
  'Servicios (Luz, Agua, Gas)',
  'Alquiler',
  'Sueldos y Jornales',
  'Marketing y Publicidad',
  'Limpieza y Mantenimiento',
  'Otros Gastos'
];

const PAYMENT_METHODS = [
  { id: 'cash', name: 'Efectivo', icon: Banknote },
  { id: 'transfer', name: 'Transferencia', icon: ArrowUpRight },
  { id: 'card', name: 'Tarjeta de Débito/Crédito', icon: CreditCard },
];

export function Finance() {
  const { 
    expenses = [], 
    addExpense, 
    paymentOrders = [], 
    addPaymentOrder, 
    orders = [] 
  } = useStore();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);

  const salesRevenue = orders.reduce((acc, o) => acc + o.total, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const balance = salesRevenue - totalExpenses;
  const totalPayables = paymentOrders.reduce((acc, po) => acc + po.amount, 0);
  const totalReceivables = invoices.reduce((acc, inv) => acc + inv.amount, 0);
  const totalCollected = invoices.filter(i => i.status === 'Pagado').reduce((acc, i) => acc + i.amount, 0);
  const pendingCollection = totalReceivables - totalCollected;

  const [activeTab, setActiveTab] = useState<'payables' | 'receivables' | 'providers'>('payables');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPaymentOrderModalOpen, setIsPaymentOrderModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  
  // Form States
  const [expenseProvider, setExpenseProvider] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseCategory, setExpenseCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Sales Modal States & Logic
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [salesPeriod, setSalesPeriod] = useState<'all' | 'day' | 'week' | 'month' | 'custom'>('all');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  const closedOrders = orders.filter(o => o.status === 'closed');
  
  const getFilteredSales = () => {
    const now = new Date();
    return closedOrders.filter(o => {
      const orderDate = new Date(o.timestamp);
      
      if (salesPeriod === 'custom') {
        if (!customDateRange.start || !customDateRange.end) return true;
        const start = new Date(customDateRange.start);
        start.setHours(0,0,0,0);
        const end = new Date(customDateRange.end);
        end.setHours(23,59,59,999);
        return orderDate >= start && orderDate <= end;
      }
      
      if (salesPeriod === 'all') return true;
      const diffTime = Math.abs(now.getTime() - orderDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (salesPeriod === 'day') return diffDays <= 1;
      if (salesPeriod === 'week') return diffDays <= 7;
      if (salesPeriod === 'month') return diffDays <= 30;
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };
  
  const filteredSales = getFilteredSales();

  const handleExportSales = () => {
    const exportData = filteredSales.map(sale => ({
      'Fecha y Hora': new Date(sale.timestamp).toLocaleString('es-AR'),
      'Método de Pago': sale.paymentMethod || 'Efectivo',
      'Monto': sale.total
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");
    XLSX.writeFile(workbook, `ventas_lynx_${salesPeriod}.xlsx`);
  };


  const handleRegisterExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || !expenseProvider) return;
    addExpense({
      provider: expenseProvider,
      description: expenseDescription,
      amount: Number(expenseAmount),
      date: expenseDate,
      category: expenseCategory
    });
    setIsExpenseModalOpen(false);
    setExpenseProvider('');
    setExpenseDescription('');
    setExpenseAmount('');
  };

  return (
    <div className="p-container-padding space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm dark:bg-[var(--bg-surface)] dark:border-white/10">
        <div>
          <h1 className="font-light text-[28px] tracking-tight text-slate-900 mb-2 dark:text-zinc-100">Finanzas</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Control de flujo de caja y gestión de proveedores.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-6 py-3 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold uppercase tracking-wide shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Registrar Gasto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* KPI Cards */}
        <div 
          onClick={() => setIsSalesModalOpen(true)}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-brand hover:shadow-md transition-all cursor-pointer group dark:bg-[var(--bg-surface)] dark:border-white/10"
        >
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-700 transition-colors dark:text-zinc-400">Ventas Totales</p>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 transition-colors" />
          </div>
          <h3 className="text-3xl font-bold text-brand tabular-nums dark:text-emerald-400">{formatMoney(salesRevenue)}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm dark:bg-[var(--bg-surface)] dark:border-white/10">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 dark:text-zinc-400">Gastos Pagados</p>
          <h3 className="text-3xl font-bold text-danger tabular-nums">{formatMoney(totalExpenses)}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm dark:bg-[var(--bg-surface)] dark:border-white/10">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 dark:text-zinc-400">Cuentas x Pagar</p>
          <h3 className="text-3xl font-bold text-amber-500 tabular-nums">{formatMoney(totalPayables)}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm dark:bg-[var(--bg-surface)] dark:border-white/10">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 dark:text-zinc-400">Balance Operativo</p>
          <h3 className={cn("text-3xl font-bold tabular-nums", balance >= 0 ? "text-brand dark:text-emerald-400" : "text-danger")}>
            {formatMoney(balance)}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Expenses List */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm dark:bg-[var(--bg-surface)] dark:border-white/10">
          <h3 className="font-bold text-slate-800 mb-6 dark:text-zinc-100">Gastos Recientes</h3>
          <div className="space-y-4">
            {expenses.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8 dark:text-zinc-400">No hay gastos registrados.</p>
            ) : (
              expenses.map(exp => (
                <div key={exp.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 dark:bg-[var(--color-paper-subtle)] dark:border-white/10">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100">{exp.provider}</h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{exp.description}</p>
                  </div>
                  <span className="font-bold text-danger tabular-nums">-{formatMoney(exp.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>


        {/* Tabs Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit dark:bg-white/5">
            <button 
              onClick={() => setActiveTab('payables')}
              className={cn("px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all", activeTab === 'payables' ? "bg-brand text-white shadow-sm" : "text-slate-500 dark:text-zinc-400")}
            >
              Cuentas x Pagar
            </button>
            <button 
              onClick={() => setActiveTab('receivables')}
              className={cn("px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all", activeTab === 'receivables' ? "bg-brand text-white shadow-sm" : "text-slate-500 dark:text-zinc-400")}
            >
              Cuentas x Cobrar
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden dark:bg-[var(--bg-surface)] dark:border-white/10">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-widest dark:bg-[var(--color-paper-subtle)] dark:border-white/10 dark:text-zinc-400">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Entidad</th>
                  <th className="px-6 py-4 text-right">Monto</th>
                  <th className="px-6 py-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {activeTab === 'payables' ? (
                  paymentOrders.map(po => (
                    <tr key={po.id} className="text-sm">
                      <td className="px-6 py-4 text-slate-500 dark:text-zinc-400">{po.date}</td>
                      <td className="px-6 py-4 font-bold">{po.provider}</td>
                      <td className="px-6 py-4 text-right font-bold">{formatMoney(po.amount)}</td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2 py-1 rounded-full text-xs font-bold uppercase", po.status === 'Pagado' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600")}>
                          {po.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  invoices.map(inv => (
                    <tr key={inv.id} className="text-sm">
                      <td className="px-6 py-4 text-slate-500 dark:text-zinc-400">{inv.date}</td>
                      <td className="px-6 py-4 font-bold">{inv.client}</td>
                      <td className="px-6 py-4 text-right font-bold">{formatMoney(inv.amount)}</td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2 py-1 rounded-full text-xs font-bold uppercase", inv.status === 'Pagado' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600")}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleRegisterExpense} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:bg-[var(--bg-surface)] dark:border-white/10">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 dark:border-white/10 dark:bg-[var(--color-paper-subtle)]">
              <h3 className="font-bold text-lg text-slate-800 dark:text-zinc-100">Registrar Gasto</h3>
              <button type="button" onClick={() => setIsExpenseModalOpen(false)}><X className="w-5 h-5 text-slate-400 dark:text-zinc-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 dark:text-zinc-400">Proveedor</label>
                <input type="text" value={expenseProvider} onChange={e => setExpenseProvider(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand dark:bg-[var(--color-paper-subtle)] dark:border-white/10" placeholder="Nombre del proveedor..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 dark:text-zinc-400">Descripción</label>
                <input type="text" value={expenseDescription} onChange={e => setExpenseDescription(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand dark:bg-[var(--color-paper-subtle)] dark:border-white/10" placeholder="¿Qué se compró?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 dark:text-zinc-400">Monto</label>
                  <input type="number" value={expenseAmount} onChange={e => setExpenseAmount(Number(e.target.value))} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand dark:bg-[var(--color-paper-subtle)] dark:border-white/10" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 dark:text-zinc-400">Categoría</label>
                  <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none dark:bg-[var(--color-paper-subtle)] dark:border-white/10">
                    {EXPENSE_CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 dark:bg-[var(--color-paper-subtle)] dark:border-white/10">
              <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 dark:bg-[var(--bg-surface)] dark:border-white/10 dark:text-zinc-300">Cancelar</button>
              <button type="submit" className="flex-1 py-3 bg-brand hover:bg-brand-hover text-white rounded-xl font-bold shadow-md transition-colors">Guardar Gasto</button>
            </div>
          </form>
        </div>
      )}
      {/* Sales History Modal */}
      {isSalesModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 dark:bg-[var(--bg-surface)]">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0 dark:border-white/10">
              <div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-zinc-100">Historial de Ventas</h3>
                <p className="text-sm text-slate-500 font-medium dark:text-zinc-400">Exporta y revisa todas las transacciones cobradas.</p>
              </div>
              <button 
                onClick={() => setIsSalesModalOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors dark:bg-white/5 dark:text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 shrink-0 gap-4 dark:border-white/10 dark:bg-[var(--color-paper-subtle)]">
              <div className="flex flex-col gap-3 w-full sm:w-auto">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSalesPeriod('all')} className={cn("px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors", salesPeriod === 'all' ? "bg-brand text-white" : "bg-white text-slate-600 border border-slate-200 dark:bg-[var(--bg-surface)] dark:text-zinc-300 dark:border-white/10")}>Todo</button>
                  <button onClick={() => setSalesPeriod('day')} className={cn("px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors", salesPeriod === 'day' ? "bg-brand text-white" : "bg-white text-slate-600 border border-slate-200 dark:bg-[var(--bg-surface)] dark:text-zinc-300 dark:border-white/10")}>Hoy</button>
                  <button onClick={() => setSalesPeriod('week')} className={cn("px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors", salesPeriod === 'week' ? "bg-brand text-white" : "bg-white text-slate-600 border border-slate-200 dark:bg-[var(--bg-surface)] dark:text-zinc-300 dark:border-white/10")}>Esta Semana</button>
                  <button onClick={() => setSalesPeriod('month')} className={cn("px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors", salesPeriod === 'month' ? "bg-brand text-white" : "bg-white text-slate-600 border border-slate-200 dark:bg-[var(--bg-surface)] dark:text-zinc-300 dark:border-white/10")}>Este Mes</button>
                  <button onClick={() => setSalesPeriod('custom')} className={cn("px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors", salesPeriod === 'custom' ? "bg-brand text-white" : "bg-white text-slate-600 border border-slate-200 dark:bg-[var(--bg-surface)] dark:text-zinc-300 dark:border-white/10")}>Personalizado</button>
                </div>
                
                {salesPeriod === 'custom' && (
                  <div className="flex items-center gap-2 animate-in slide-in-from-top-2">
                    <input 
                      type="date" 
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand dark:bg-[var(--bg-surface)] dark:border-white/10"
                    />
                    <span className="text-slate-400 text-sm dark:text-zinc-400">a</span>
                    <input 
                      type="date" 
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand dark:bg-[var(--bg-surface)] dark:border-white/10"
                    />
                  </div>
                )}
              </div>

              <button 
                onClick={handleExportSales}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Download className="w-4 h-4" /> Exportar Excel
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-widest dark:bg-[var(--color-paper-subtle)] dark:border-white/10 dark:text-zinc-400">
                    <th className="px-6 py-4 rounded-tl-xl">Fecha y Hora</th>
                    <th className="px-6 py-4">Método de Pago</th>
                    <th className="px-6 py-4 text-right rounded-tr-xl">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-10 text-slate-400 font-medium dark:text-zinc-400">No hay ventas en el periodo seleccionado.</td>
                    </tr>
                  ) : (
                    filteredSales.map(sale => (
                      <tr key={sale.id} className="text-sm hover:bg-slate-50 transition-colors dark:hover:bg-white/5">
                        <td className="px-6 py-4 text-slate-600 dark:text-zinc-300">{new Date(sale.timestamp).toLocaleString('es-AR')}</td>
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-zinc-100">{sale.paymentMethod || 'Efectivo'}</td>
                        <td className="px-6 py-4 text-right font-bold text-brand tabular-nums dark:text-emerald-400">{formatMoney(sale.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0 dark:bg-[var(--color-paper-subtle)] dark:border-white/10">
               <h3 className="text-lg text-slate-600 font-bold dark:text-zinc-300">
                 Total Filtrado: <span className="text-brand text-2xl ml-2 tabular-nums dark:text-emerald-400">{formatMoney(filteredSales.reduce((acc, s) => acc + s.total, 0))}</span>
               </h3>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
