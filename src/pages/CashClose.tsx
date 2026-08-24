import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useStore } from '../contexts/StoreContext';
import {
  LockIcon,
  AlertTriangle,
  Banknote,
  CreditCard,
  Clock,
  Printer,
  ChevronRight,
  Landmark,
  XCircle,
  FileCheck2,
  PlayCircle,
  HelpCircle
} from "lucide-react";

export function CashClose() {
  const { orders, tables, openShift, closeShift, activeShift, shifts } = useStore();
  
  // State for Shift Opening
  const [initialCashInput, setInitialCashInput] = useState('');
  const [cashierNameInput, setCashierNameInput] = useState('Cajero Principal');

  // State for Shift Closing
  const [declaredCashInput, setDeclaredCashInput] = useState('');
  const [comments, setComments] = useState('');

  // Shift start time derived from activeShift or defaults
  const shiftStart = activeShift ? new Date(activeShift.startTime) : null;

  // Filter orders for the current active shift
  const currentShiftOrders = useMemo(() => {
    if (!shiftStart) return [];
    return orders.filter(o => {
      const orderDate = new Date(o.timestamp);
      return orderDate >= shiftStart && o.status === 'closed';
    });
  }, [orders, shiftStart]);

  // Calculate totals
  const totals = useMemo(() => {
    return currentShiftOrders.reduce((acc, order) => {
      const method = order.paymentMethod?.toLowerCase() || '';
      if (method.includes('efectivo')) acc.cash += order.total;
      else if (method.includes('tarjeta')) acc.card += order.total;
      else if (method.includes('transferencia') || method.includes('mercado')) acc.transfer += order.total;
      else acc.cash += order.total; // Default to cash if not specified
      return acc;
    }, { cash: 0, card: 0, transfer: 0 });
  }, [currentShiftOrders]);

  const mesasPendientes = tables.filter(t => t.status !== 'available' && t.status !== 'dirty').length;
  
  const declaredCash = parseFloat(declaredCashInput.replace(/[^0-9.-]+/g,"")) || 0;
  const initialCash = activeShift ? activeShift.initialCash : 0;
  const expectedCash = initialCash + totals.cash;
  const difference = declaredCash - expectedCash;
  const totalDeclaredAllMethods = declaredCash + totals.card + totals.transfer;

  const handleOpenShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const initCash = parseFloat(initialCashInput) || 0;
    if (initCash < 0) {
      alert("El fondo inicial no puede ser negativo.");
      return;
    }
    try {
      await openShift(cashierNameInput, initCash);
      alert("Turno abierto exitosamente.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirmClose = async () => {
    if (!activeShift) return;
    if (mesasPendientes > 0) {
      alert(`No puede cerrar caja con ${mesasPendientes} mesas activas en el salón.`);
      return;
    }
    if (difference !== 0 && !comments.trim()) {
      alert("Debe ingresar un comentario justificando la diferencia de caja.");
      return;
    }
    if (!window.confirm("¿Está seguro de cerrar el turno?")) return;

    try {
      await closeShift(declaredCash, comments);
      alert("Turno cerrado exitosamente.");
      setDeclaredCashInput('');
      setComments('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePrintZ = () => {
    window.print();
  };

  // Render Opening View if there's no activeShift
  if (!activeShift) {
    return (
      <div className="p-6 lg:p-10 flex flex-col items-center justify-center max-w-xl mx-auto min-h-[calc(100vh-64px)] py-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-10 w-full shadow-2xl space-y-8 text-center"
        >
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-[2rem] flex items-center justify-center mx-auto mb-2 border border-indigo-100 dark:border-indigo-900/30">
            <PlayCircle className="w-10 h-10" />
          </div>
          <div>
            <h1 className="font-black text-3xl text-slate-900 dark:text-white tracking-tight">Apertura de Caja</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2">Declara el fondo inicial antes de iniciar las ventas del turno.</p>
          </div>

          <form onSubmit={handleOpenShiftSubmit} className="space-y-6 text-left pt-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Operador (Cajero)</label>
              <input
                required
                type="text"
                value={cashierNameInput}
                onChange={(e) => setCashierNameInput(e.target.value)}
                className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl px-5 font-black text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 outline-none transition-all shadow-inner"
                placeholder="Nombre del cajero..."
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fondo de Caja Inicial (Efectivo)</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">$</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={initialCashInput}
                  onChange={(e) => setInitialCashInput(e.target.value)}
                  className="w-full h-14 pl-10 pr-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl font-black text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 outline-none transition-all shadow-inner"
                  placeholder="0.00"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              Iniciar Turno / Abrir Caja <ChevronRight className="w-5 h-5" />
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 flex flex-col md:flex-row gap-8 items-start justify-center max-w-7xl mx-auto min-h-[calc(100vh-64px)] py-12 transition-colors duration-500">
      
      {/* Configuration & Steps */}
      <div className="flex-1 w-full space-y-6">
        <div>
          <h1 className="font-black text-[40px] text-slate-900 dark:text-white tracking-tighter mb-2">Cierre de Caja</h1>
          <p className="text-body-md text-slate-500 dark:text-slate-400 font-medium">
            Turno actual (Desde {shiftStart?.toLocaleTimeString()} - {shiftStart?.toLocaleDateString()}) • Operador: <span className="font-bold text-indigo-600 dark:text-indigo-400">{activeShift.cashierName}</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="font-black text-xl text-slate-800 dark:text-white mb-1">Verificación de Totales</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Revise las cifras calculadas por el sistema frente al efectivo real ingresado.</p>
          </div>
          
          <div className="p-8 space-y-8 bg-white dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row justify-between items-center p-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/20 dark:bg-indigo-950/20 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Banknote className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white">Efectivo Físico Contado</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Entrada manual requerida</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-3 w-full sm:w-auto">
                <span className="text-slate-400 font-black text-2xl">$</span>
                <input 
                  type="number"
                  placeholder="0.00"
                  value={declaredCashInput}
                  onChange={(e) => setDeclaredCashInput(e.target.value)}
                  className="font-black text-[32px] text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-900 rounded-2xl px-6 py-3 w-full sm:w-48 text-right outline-none focus:border-indigo-500 transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-4 px-2">
              {[
                { icon: Banknote, label: 'Fondo de Caja Inicial', value: initialCash },
                { icon: Banknote, label: 'Ventas Efectivo Turno', value: totals.cash },
                { icon: CreditCard, label: 'Tarjetas (Visa, Master)', value: totals.card },
                { icon: Landmark, label: 'Transferencias / Pago Móvil', value: totals.transfer },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-3 border-b border-dashed border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400 font-bold flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-slate-400" /> {item.label}
                  </span>
                  <span className="font-black text-slate-800 dark:text-slate-200 text-xl">${item.value.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-4">
                <span className="text-slate-600 dark:text-slate-400 font-bold flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-400" /> Mesas Activas / Abiertas
                </span>
                <span className={cn(
                  "font-black text-2xl px-4 py-1 rounded-full",
                  mesasPendientes > 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 animate-pulse' : 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20'
                )}>
                  {mesasPendientes}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Warning card for Difference */}
        {difference !== 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-[2rem] p-6 flex gap-5"
          >
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-black text-amber-800 dark:text-amber-300 text-lg">Diferencia de Caja Detectada</h4>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1 font-medium leading-relaxed">
                El sistema indica que deberían haber <b className="text-amber-900 dark:text-amber-200">${expectedCash.toLocaleString()}</b> en efectivo. Detectada una diferencia de <b className="text-amber-900 dark:text-amber-200">${difference > 0 ? '+' : ''}{difference.toLocaleString()}</b>. 
                Deberá justificar esta diferencia antes de cerrar el turno.
              </p>
            </div>
          </motion.div>
        )}

      </div>

      {/* Summary Card */}
      <div className="w-full md:w-[420px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden sticky top-8 transition-all">
        <div className="bg-slate-900 dark:bg-black text-white p-10 text-center relative">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/20 relative z-10 mt-4 backdrop-blur-md">
             <LockIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-center relative z-10 tracking-tight">Resumen de Cierre</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2 text-center mb-8 relative z-10">Turno #{shifts.length + 1}</p>
          
          <svg className="absolute bottom-0 left-0 w-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
            <path fill="currentColor" className="text-white dark:text-slate-900" fillOpacity="1" d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,250.7C1248,256,1344,288,1392,304L1440,320L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
        
        <div className="p-10 bg-white dark:bg-slate-900 space-y-8">
          <div className="text-center">
            <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-[10px] mb-2">TOTAL DECLARADO (TODOS LOS MÉTODOS)</p>
            <h2 className="font-black text-[48px] leading-tight text-slate-900 dark:text-white tracking-tighter">${totalDeclaredAllMethods.toLocaleString()}</h2>
            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase mt-3",
              difference === 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'
            )}>
              <AlertTriangle className="w-3.5 h-3.5" /> Diferencia: ${difference > 0 ? '+' : ''}{difference.toLocaleString()}
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Comentarios de Cierre</label>
            <textarea 
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full h-28 p-5 border-2 border-slate-50 dark:border-slate-800 rounded-3xl text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-bold resize-none shadow-inner"
              placeholder="Ej: Faltante por error en vuelto..."
            ></textarea>
          </div>

          <div className="flex flex-col gap-3 pt-4">
             <button 
                onClick={handleConfirmClose}
                className="w-full h-16 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-rose-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-3">
               <FileCheck2 className="w-6 h-6" /> Confirmar Cierre de Turno
             </button>
             <button onClick={handlePrintZ} className="w-full h-14 border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
               <Printer className="w-5 h-5" /> Imprimir Reporte Z
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
