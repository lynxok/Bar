import React, { useState, useMemo } from 'react';
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
      <div className="p-container-padding flex flex-col items-center justify-center max-w-xl mx-auto min-h-[calc(100vh-64px)] py-12">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 w-full shadow-lg space-y-6 text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <PlayCircle className="w-8 h-8" />
          </div>
          <div>
            <h1 className="font-bold text-2xl text-slate-900">Apertura de Caja</h1>
            <p className="text-sm text-slate-500 mt-1">Declara el fondo inicial antes de iniciar las ventas del turno.</p>
          </div>

          <form onSubmit={handleOpenShiftSubmit} className="space-y-4 text-left pt-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nombre del Operador (Cajero)</label>
              <input
                required
                type="text"
                value={cashierNameInput}
                onChange={(e) => setCashierNameInput(e.target.value)}
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Nombre del cajero..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Fondo de Caja Inicial (Efectivo)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={initialCashInput}
                  onChange={(e) => setInitialCashInput(e.target.value)}
                  className="w-full h-12 pl-8 pr-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 pt-1"
            >
              Iniciar Turno / Abrir Caja
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-container-padding flex flex-col md:flex-row gap-8 items-start justify-center max-w-7xl mx-auto min-h-[calc(100vh-64px)] py-12">
      
      {/* Configuration & Steps */}
      <div className="flex-1 w-full space-y-6">
        <div>
          <h1 className="font-bold text-[32px] text-slate-900 mb-2">Cierre de Caja</h1>
          <p className="text-body-md text-slate-500">
            Turno actual (Desde {shiftStart?.toLocaleTimeString()} - {shiftStart?.toLocaleDateString()}) • Operador: <span className="font-bold text-slate-800">{activeShift.cashierName}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-lg text-slate-800 mb-1">Verificación de Totales</h3>
            <p className="text-sm text-slate-500">Revise las cifras calculadas por el sistema frente al efectivo real ingresado.</p>
          </div>
          
          <div className="p-6 space-y-6 bg-white">
            <div className="flex justify-between items-center p-4 rounded-xl border border-indigo-100 bg-indigo-50/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Efectivo Físico Contado</h4>
                  <p className="text-sm text-slate-500">Entrada manual requerida</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className="text-slate-400 font-bold text-xl">$</span>
                <input 
                  type="number"
                  placeholder="0.00"
                  value={declaredCashInput}
                  onChange={(e) => setDeclaredCashInput(e.target.value)}
                  className="font-bold text-[24px] text-slate-800 bg-white border-2 border-indigo-200 rounded-lg px-4 py-2 w-48 text-right outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-3 px-2">
              <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                <span className="text-slate-600 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-slate-400" /> Fondo de Caja Inicial
                </span>
                <span className="font-bold text-slate-800 text-lg">${initialCash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                <span className="text-slate-600 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-slate-400" /> Ventas Efectivo Turno
                </span>
                <span className="font-bold text-slate-800 text-lg">${totals.cash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                <span className="text-slate-600 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-400" /> Tarjetas (Visa, Master)
                </span>
                <span className="font-bold text-slate-800 text-lg">${totals.card.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                <span className="text-slate-600 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-slate-400" /> Transferencias / Pago Móvil
                </span>
                <span className="font-bold text-slate-800 text-lg">${totals.transfer.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                <span className="text-slate-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" /> Mesas Activas / Abiertas
                </span>
                <span className={`font-bold text-lg ${mesasPendientes > 0 ? 'text-rose-600 animate-pulse' : 'text-emerald-500'}`}>
                  {mesasPendientes}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Warning card for Difference */}
        {difference !== 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-800 text-sm">Diferencia de Caja Detectada</h4>
              <p className="text-sm text-amber-700 mt-1">
                El sistema indica que deberían haber <b>${expectedCash.toLocaleString()}</b> en efectivo. Detectada una diferencia de <b>${difference > 0 ? '+' : ''}{difference.toLocaleString()}</b>. 
                Deberá justificar esta diferencia antes de cerrar el turno.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Summary Card */}
      <div className="w-full md:w-[400px] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden sticky top-8">
        <div className="bg-slate-900 text-white p-6 text-center relative">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20 relative z-10 mt-6">
             <LockIcon className="w-8 h-8 text-white mt-1" />
          </div>
          <h2 className="text-[20px] font-bold text-center relative z-10">Resumen de Cierre</h2>
          <p className="text-slate-400 text-sm mt-1 text-center mb-6 relative z-10">Turno #{shifts.length + 1}</p>
          
          <svg className="absolute bottom-0 left-0 w-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
            <path fill="#ffffff" fillOpacity="1" d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,250.7C1248,256,1344,288,1392,304L1440,320L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
        
        <div className="p-6 bg-white space-y-6">
          <div className="text-center">
            <p className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-1">TOTAL DECLARADO (TODOS LOS MÉTODOS)</p>
            <h2 className="font-black text-[38px] leading-tight text-slate-800">${totalDeclaredAllMethods.toLocaleString()}</h2>
            <p className={`text-sm font-bold mt-1 ${difference === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              Diferencia: ${difference > 0 ? '+' : ''}{difference.toLocaleString()}
            </p>
          </div>
          
          <div className="pt-6 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Comentarios de Cierre (Obligatorio si hay dif.)</label>
            <textarea 
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full h-24 p-3 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium"
              placeholder="Ej: Faltante de 7.50 por error en dar vuelto mesa 12."
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
             <button onClick={handlePrintZ} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
               <Printer className="w-5 h-5" /> Imprimir Z
             </button>
             <button 
                onClick={handleConfirmClose}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 text-white font-bold hover:brightness-110 shadow-md transition-all active:scale-95 text-sm uppercase tracking-wider">
               <FileCheck2 className="w-5 h-5" /> Confirmar Cierre
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
