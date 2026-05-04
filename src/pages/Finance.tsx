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
  Calendar
} from "lucide-react";
import { cn } from "../lib/utils";

const INITIAL_EXPENSES = [
  { id: '1', provider: 'Global Spirits Co.', description: 'Reposición Licores', amount: 1420.00, date: '2024-03-20', time: 'Hace 2 min', category: 'Insumos' },
  { id: '2', provider: 'Mercado Central', description: 'Verduras y Frescos', amount: 385.50, date: '2024-03-19', time: 'Ayer', category: 'Insumos' },
  { id: '3', provider: 'Servicio Eléctrico', description: 'Factura de Luz', amount: 842.00, date: '2024-03-14', time: '14 Mar', category: 'Servicios' },
];

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

const INITIAL_PAYMENT_ORDERS = [
  { id: 'OC-2024-001', date: '2024-03-20', dueDate: '2024-03-25', provider: 'Distribuidora Central', description: 'Compra Bebidas Mes Mayo', amount: 3500.00, status: 'Pendiente' },
  { id: 'OC-2024-002', date: '2024-03-15', dueDate: '2024-04-15', provider: 'Alquileres Inmobiliarios', description: 'Mes de Abril', amount: 8500.00, status: 'Pendiente' },
  { id: 'OC-2024-003', date: '2024-03-01', dueDate: '2024-03-10', provider: 'Mantenimiento Preventivo', description: 'Aire Acondicionado', amount: 1200.00, status: 'Vencido' },
];

const INITIAL_PROVIDERS = [
  { id: 'PROV-001', name: 'Distribuidora Central', category: 'Insumos', email: 'ventas@distcentral.com', phone: '11-4567-8900', cuit: '30-12345678-9' },
  { id: 'PROV-002', name: 'Alquileres Inmobiliarios', category: 'Alquiler', email: 'admin@inmobiliaria.com', phone: '11-9876-5432', cuit: '30-87654321-0' },
  { id: 'PROV-003', name: 'Mantenimiento Preventivo', category: 'Servicios', email: 'soporte@mantenimiento.com', phone: '11-2233-4455', cuit: '30-11223344-5' },
];

const INITIAL_INVOICES = [
  { id: 'INV-2024-001', date: '2024-03-18', client: 'Tech Event Co.', description: 'Reserva de Salón Privado', amount: 2450.00, status: 'Pendiente' },
  { id: 'INV-2024-002', date: '2024-03-15', client: 'Comida Corporativa SA', description: 'Desayuno Ejecutivo', amount: 850.00, status: 'Pagado' },
];

export function Finance() {
  const [expenses, setExpenses] = useState(INITIAL_EXPENSES);
  const [paymentOrders, setPaymentOrders] = useState(INITIAL_PAYMENT_ORDERS);
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);
  const [providers, setProviders] = useState(INITIAL_PROVIDERS);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPaymentOrderModalOpen, setIsPaymentOrderModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  
  // Expense Form State
  const [expenseProvider, setExpenseProvider] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseCategory, setExpenseCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Payment Order Form State (Accounts Payable)
  const [poProvider, setPoProvider] = useState('');
  const [poDescription, setPoDescription] = useState('');
  const [poAmount, setPoAmount] = useState<number | ''>('');
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [poDueDate, setPoDueDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  // Provider Form State
  const [provName, setProvName] = useState('');
  const [provCategory, setProvCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [provEmail, setProvEmail] = useState('');
  const [provPhone, setProvPhone] = useState('');
  const [provCuit, setProvCuit] = useState('');

  const handleRegisterExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || !expenseProvider) return;

    const newExpense = {
      id: Math.random().toString(36).substr(2, 9),
      provider: expenseProvider,
      description: expenseDescription,
      amount: Number(expenseAmount),
      date: expenseDate,
      time: 'Recién',
      category: expenseCategory
    };

    setExpenses([newExpense, ...expenses]);
    resetExpenseForm();
  };

  const handleRegisterPaymentOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poAmount || !poProvider) return;

    const newPO = {
      id: `OC-2024-${Math.floor(100 + Math.random() * 900)}`,
      date: poDate,
      dueDate: poDueDate,
      provider: poProvider,
      description: poDescription,
      amount: Number(poAmount),
      status: 'Pendiente'
    };

    setPaymentOrders([newPO, ...paymentOrders]);
    resetPoForm();
  };

  const resetExpenseForm = () => {
    setExpenseProvider('');
    setExpenseDescription('');
    setExpenseAmount('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setIsExpenseModalOpen(false);
  };

  const resetPoForm = () => {
    setPoProvider('');
    setPoDescription('');
    setPoAmount('');
    setPoDate(new Date().toISOString().split('T')[0]);
    setPoDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setIsPaymentOrderModalOpen(false);
  };

  const handleRegisterProvider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provName) return;

    const newProvider = {
      id: `PROV-${Math.floor(100 + Math.random() * 900)}`,
      name: provName,
      category: provCategory,
      email: provEmail,
      phone: provPhone,
      cuit: provCuit
    };

    setProviders([newProvider, ...providers]);
    resetProvForm();
  };

  const resetProvForm = () => {
    setProvName('');
    setProvCategory(EXPENSE_CATEGORIES[0]);
    setProvEmail('');
    setProvPhone('');
    setProvCuit('');
    setIsProviderModalOpen(false);
  };

  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const totalPayables = paymentOrders.reduce((acc, po) => acc + po.amount, 0);
  const overduePayables = paymentOrders
    .filter(po => po.status === 'Vencido' || (po.status === 'Pendiente' && new Date(po.dueDate) < new Date()))
    .reduce((acc, po) => acc + po.amount, 0);
  const totalReceivables = invoices.reduce((acc, inv) => acc + inv.amount, 0);
  const totalCollected = invoices.filter(i => i.status === 'Pagado').reduce((acc, i) => acc + i.amount, 0);
  const pendingCollection = totalReceivables - totalCollected;

  const [activeTab, setActiveTab] = useState<'payables' | 'receivables' | 'providers'>('payables');

  const handleRegisterInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poAmount || !poProvider) return; // Note: using PO amount for now as placeholder or should use dedicated state

    const newInvoice = {
      id: `INV-2024-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split('T')[0],
      client: poProvider,
      description: poDescription,
      amount: Number(poAmount),
      status: 'Pendiente'
    };

    setInvoices([newInvoice, ...invoices]);
    setIsInvoiceModalOpen(false);
  };

  return (
    <div className="p-container-padding space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="font-bold text-2xl text-slate-900 mb-2">Finanzas</h1>
          <p className="text-sm font-medium text-slate-500 max-w-2xl">
            Control de flujo de caja, gastos directos, órdenes de pago a proveedores y gestión de cobros pendientes.
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsInvoiceModalOpen(true)}
            className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wide text-slate-700 shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <Receipt className="w-5 h-5 text-emerald-500" />
            Nuevo Cobro Pendiente
          </button>
          <button 
            onClick={() => setIsPaymentOrderModalOpen(true)}
            className="px-6 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold uppercase tracking-wide shadow-sm hover:bg-amber-100 transition-all flex items-center gap-2"
          >
            <Clock className="w-5 h-5" />
            Nueva Orden de Pago
          </button>
          <button 
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wide shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
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
               <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-300">RESUMEN FINANCIERO</h3>
             </div>
             
             <div className="mb-6">
               <p className="text-sm font-bold text-slate-400 mb-1">Ingresos Cobrados</p>
               <h2 className="font-bold text-4xl text-emerald-400">${totalCollected.toLocaleString()}</h2>
             </div>
             
             <div className="space-y-4">
               <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                 <div className="flex items-center gap-2">
                   <div className="p-1 rounded bg-amber-500/20 text-amber-400"><Clock className="w-4 h-4" /></div>
                   <span className="text-sm font-medium text-slate-300">Pendiente de Cobro</span>
                 </div>
                 <span className="font-bold text-white">${pendingCollection.toLocaleString()}</span>
               </div>

               <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                 <div className="flex items-center gap-2">
                   <div className="p-1 rounded bg-red-500/20 text-red-400"><ArrowDownRight className="w-4 h-4" /></div>
                   <span className="text-sm font-medium text-slate-300">Gastos Realizados</span>
                 </div>
                 <span className="font-bold text-white">${totalExpenses.toLocaleString()}</span>
               </div>

               <div className="flex justify-between items-center">
                 <div className="flex items-center gap-2">
                   <div className="p-1 rounded bg-indigo-500/20 text-indigo-400"><Receipt className="w-4 h-4" /></div>
                   <span className="text-sm font-medium text-slate-300">Cuentas por Pagar</span>
                 </div>
                 <span className="font-bold text-indigo-400">${totalPayables.toLocaleString()}</span>
               </div>

               {overduePayables > 0 && (
                 <div className="mt-4 p-3 bg-red-500/10 rounded-lg flex items-center gap-3 border border-red-500/20">
                   <AlertTriangle className="w-5 h-5 text-red-500" />
                   <div>
                     <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">ALERTA PAGOS</p>
                     <p className="text-sm font-bold text-white">${overduePayables.toLocaleString()} vencidos</p>
                   </div>
                 </div>
               )}
             </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800">Gastos Recientes</h3>
                <button className="text-indigo-600 text-xs font-bold uppercase tracking-widest hover:underline">Ver todos</button>
             </div>
             
             <div className="space-y-4">
               {expenses.map(expense => (
                 <div key={expense.id} className="flex items-center gap-4 group cursor-pointer p-2 -mx-2 rounded-lg hover:bg-slate-50">
                   <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm">
                     <FileText className="w-6 h-6" />
                   </div>
                   <div className="flex-1">
                     <h4 className="font-bold text-sm text-on-surface mb-0.5">{expense.provider}</h4>
                     <p className="text-xs text-slate-500">{expense.description} • {expense.time}</p>
                   </div>
                   <div className="text-right">
                     <span className="font-bold text-error">-${expense.amount.toLocaleString()}</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Right Col: Tabs and Tables */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          {/* Tabs Navigation */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-2 w-fit">
            <button 
              onClick={() => setActiveTab('payables')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                activeTab === 'payables' 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              <ArrowDownRight className="w-4 h-4" />
              Órdenes de Pago
              <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-[10px]">
                {paymentOrders.length}
              </span>
            </button>
            <button 
              onClick={() => setActiveTab('receivables')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                activeTab === 'receivables' 
                  ? "bg-white text-emerald-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              <ArrowUpRight className="w-4 h-4" />
              Cuentas por Cobrar
              <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full text-[10px]">
                {invoices.length}
              </span>
            </button>
            <button 
              onClick={() => setActiveTab('providers')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                activeTab === 'providers' 
                  ? "bg-white text-emerald-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              <FileText className="w-4 h-4" />
              Proveedores
              <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">
                {providers.length}
              </span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <h3 className="font-bold text-slate-800">
                 {activeTab === 'payables' ? 'Acreedores (Lo que debemos)' : 
                  activeTab === 'receivables' ? 'Deudores (Lo que nos deben)' : 
                  'Directorio de Proveedores'}
               </h3>
               <div className="flex items-center gap-3">
                  {activeTab === 'providers' ? (
                    <button 
                      onClick={() => setIsProviderModalOpen(true)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Nuevo Proveedor
                    </button>
                  ) : (
                    <div className="relative">
                      <select className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent">
                        <option>Todos los Estados</option>
                        <option>Pendientes</option>
                        <option>Vencidos</option>
                        <option>Pagados</option>
                      </select>
                      <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  )}
               </div>
            </div>
            
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {activeTab === 'providers' ? (
                      <>
                        <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500">PROVEEDOR</th>
                        <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500">CONTACTO</th>
                        <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500">CUIT</th>
                        <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500 text-right">DEUDA TOTAL</th>
                        <th className="px-6 py-4"></th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500">IDENTIFICADOR</th>
                        <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500">
                          {activeTab === 'payables' ? 'PROVEEDOR' : 'CLIENTE'}
                        </th>
                        <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500 text-center">VENCIMIENTO</th>
                        <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500 text-right">MONTO</th>
                        <th className="px-6 py-4 font-label-caps text-label-caps text-slate-500">ESTADO</th>
                        <th className="px-6 py-4"></th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeTab === 'payables' ? (
                    paymentOrders.map(po => {
                      const isOverdue = po.status !== 'Pagado' && new Date(po.dueDate) < new Date();
                      
                      return (
                        <tr key={po.id} className={cn("hover:bg-slate-50 transition-colors cursor-pointer group", isOverdue && "bg-red-50/20")}>
                          <td className="px-6 py-4 text-sm font-bold text-on-surface">{po.id}</td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-on-surface">{po.provider}</p>
                            <p className="text-xs text-slate-400">{po.description}</p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={cn(
                              "text-xs font-bold px-2 py-0.5 rounded",
                              isOverdue ? "text-red-700 bg-red-100" : "text-slate-500 bg-slate-100"
                            )}>
                              {new Date(po.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-on-surface text-right">${po.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full",
                              po.status === 'Pagado' ? "bg-green-100 text-green-700" :
                              isOverdue ? "bg-red-100 text-red-700" :
                              "bg-yellow-100 text-yellow-800"
                            )}>
                              {po.status === 'Pagado' ? <CheckCircle2 className="w-3.5 h-3.5" /> : 
                               isOverdue ? <AlertTriangle className="w-3.5 h-3.5" /> : 
                               <Clock className="w-3.5 h-3.5" />}
                              {isOverdue ? 'Vencido' : po.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 text-slate-400 hover:text-primary transition-colors"><MoreVertical className="w-5 h-5" /></button>
                          </td>
                        </tr>
                      )
                    })
                  ) : activeTab === 'receivables' ? (
                    invoices.map(invoice => (
                      <tr key={invoice.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                        <td className="px-6 py-4 text-sm font-bold text-on-surface">{invoice.id}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-on-surface">{invoice.client}</p>
                          <p className="text-xs text-slate-400">{invoice.description}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-bold px-2 py-0.5 rounded text-slate-500 bg-slate-100">
                            {new Date(invoice.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right font-mono">+${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full",
                            invoice.status === 'Pagado' ? "bg-green-100 text-green-700" :
                            invoice.status === 'Vencido' ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-800"
                          )}>
                            {invoice.status === 'Pagado' ? <CheckCircle2 className="w-3.5 h-3.5" /> : 
                             invoice.status === 'Vencido' ? <AlertTriangle className="w-3.5 h-3.5" /> : 
                             <Clock className="w-3.5 h-3.5" />}
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-slate-400 hover:text-primary transition-colors"><MoreVertical className="w-5 h-5" /></button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    providers.map(provider => {
                      const providerDebt = paymentOrders
                        .filter(po => po.provider === provider.name && po.status !== 'Pagado')
                        .reduce((sum, po) => sum + po.amount, 0);
                        
                      return (
                        <tr key={provider.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-on-surface">{provider.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{provider.category}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-slate-600">{provider.email}</p>
                            <p className="text-xs text-slate-400">{provider.phone}</p>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{provider.cuit}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={cn(
                              "font-bold text-sm",
                              providerDebt > 0 ? "text-red-600" : "text-green-600"
                            )}>
                              ${providerDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 text-slate-400 hover:text-primary transition-colors"><MoreVertical className="w-5 h-5" /></button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Register Invoice Modal (Receivables) */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Nuevo Cobro Pendiente</h2>
                <p className="text-sm text-slate-500 mt-1">Registra facturas emitidas a clientes que aún no han pagado.</p>
              </div>
              <button 
                onClick={() => setIsInvoiceModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleRegisterInvoice} className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Monto a Cobrar</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      autoFocus
                      placeholder="0.00"
                      value={poAmount}
                      onChange={(e) => setPoAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cliente / Empresa</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej. Nombre del Cliente, Empresa SA..."
                    value={poProvider}
                    onChange={(e) => setPoProvider(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Concepto / Servicio</label>
                  <textarea 
                    rows={3}
                    placeholder="Ej. Reserva de salón, servicio de catering..."
                    value={poDescription}
                    onChange={(e) => setPoDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white pb-2">
                <button 
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-colors uppercase text-xs tracking-widest"
                >
                  Registrar Cobro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Registrar Nuevo Gasto Directo</h2>
                <p className="text-sm text-slate-500 mt-1">Egresos pagados en el momento (Caja/Efectivo).</p>
              </div>
              <button 
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleRegisterExpense} className="p-6 space-y-6 overflow-y-auto">
              {/* Existing Expense form fields... */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Monto del Gasto</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      autoFocus
                      placeholder="0.00"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-bold text-red-600 focus:ring-2 focus:ring-red-500 outline-none placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Método de Pago</label>
                  <div className="grid grid-cols-3 gap-3">
                    {PAYMENT_METHODS.map(method => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all gap-2",
                          paymentMethod === method.id 
                            ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm ring-2 ring-indigo-50" 
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                      >
                        <method.icon className="w-5 h-5" />
                        {method.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Categoría</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select 
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                    >
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="date" 
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Proveedor / Beneficiario</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej. Mercado Central, Empresa de Luz..."
                    value={expenseProvider}
                    onChange={(e) => setExpenseProvider(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descripción / Notas</label>
                  <textarea 
                    rows={3}
                    placeholder="Detalles adicionales del gasto..."
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white pb-2">
                <button 
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors uppercase text-xs tracking-widest"
                >
                  Confirmar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Provider Modal */}
      {isProviderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Nuevo Proveedor</h2>
                <p className="text-sm text-slate-500 mt-1">Registra los datos fiscales y de contacto de tus proveedores.</p>
              </div>
              <button 
                onClick={() => setIsProviderModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleRegisterProvider} className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Razón Social / Nombre</label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    placeholder="Ej. Empresa de Suministros SA"
                    value={provName}
                    onChange={(e) => setProvName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-500 outline-none"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Categoría</label>
                  <select 
                    value={provCategory}
                    onChange={(e) => setProvCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">CUIT</label>
                  <input 
                    type="text" 
                    placeholder="30-XXXXXXXX-X"
                    value={provCuit}
                    onChange={(e) => setProvCuit(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-slate-500 outline-none"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                  <input 
                    type="email" 
                    placeholder="proveedor@email.com"
                    value={provEmail}
                    onChange={(e) => setProvEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-slate-500 outline-none"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Teléfono</label>
                  <input 
                    type="text" 
                    placeholder="11-XXXX-XXXX"
                    value={provPhone}
                    onChange={(e) => setProvPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-slate-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white pb-2">
                <button 
                  type="button"
                  onClick={() => setIsProviderModalOpen(false)}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-colors uppercase text-xs tracking-widest"
                >
                  Añadir Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Order Modal */}
      {isPaymentOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Nueva Orden de Pago</h2>
                <p className="text-sm text-slate-500 mt-1">Registra deudas con proveedores y facturas a pagar.</p>
              </div>
              <button 
                onClick={() => setIsPaymentOrderModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleRegisterPaymentOrder} className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Monto a Pagar</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      autoFocus
                      placeholder="0.00"
                      value={poAmount}
                      onChange={(e) => setPoAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha de Factura</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="date" 
                      value={poDate}
                      onChange={(e) => setPoDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-red-500 uppercase tracking-wider mb-1 font-serif underline decoration-red-200">Vencimiento</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                    <input 
                      type="date" 
                      required
                      value={poDueDate}
                      onChange={(e) => setPoDueDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-red-50 border border-red-100 rounded-lg text-sm font-bold text-red-700 focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Proveedor</label>
                  <select 
                    required
                    value={poProvider}
                    onChange={(e) => setPoProvider(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                  >
                    <option value="">Seleccionar Proveedor...</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-[10px] text-slate-400">Si el proveedor no existe, créalo primero en la pestaña "Proveedores".</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Concepto</label>
                  <textarea 
                    rows={3}
                    placeholder="Detalles sobre qué se está facturando..."
                    value={poDescription}
                    onChange={(e) => setPoDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white pb-2">
                <button 
                  type="button"
                  onClick={() => setIsPaymentOrderModalOpen(false)}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-colors uppercase text-xs tracking-widest"
                >
                  Registrar Orden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
