import { useState, useMemo } from 'react';
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
  FileCheck2
} from "lucide-react";

export function CashClose() {
  const { orders, tables, addShift, shifts } = useStore();
  const [declaredCashInput, setDeclaredCashInput] = useState('');
  const [comments, setComments] = useState('');

  // Determine shift start time
  const lastShift = shifts.length > 0 ? shifts[shifts.length - 1] : null;
  const shiftStart = lastShift ? new Date(lastShift.endTime) : new Date(new Date().setHours(0,0,0,0));

  // Filter orders for the current shift
  const currentShiftOrders = orders.filter(o => {
    const orderDate = new Date(o.timestamp);
    return orderDate >= shiftStart && o.status === 'closed';
  });

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

  const mesasPendientes = tables.filter(t => t.status !== 'available').length;
  
  const declaredCash = parseFloat(declaredCashInput.replace(/[^0-9.-]+/g,"")) || 0;
  const expectedCash = totals.cash;
  const difference = declaredCash - expectedCash;
  const totalDeclaredAllMethods = declaredCash + totals.card + totals.transfer;

  const handleConfirmClose = async () => {
    if (mesasPendientes > 0) {
      alert("No puede cerrar caja con mesas pendientes.");
      return;
    }
    if (difference !== 0 && !comments.trim()) {
      alert("Debe ingresar un comentario justificando la diferencia de caja.");
      return;
    }
    if (!window.confirm("¿Está seguro de cerrar el turno?")) return;

    await addShift({
      cashierName: "Cajero", 
      startTime: shiftStart.toISOString(),
      endTime: new Date().toISOString(),
      expectedCash,
      declaredCash,
      difference,
      cardTotal: totals.card,
      transferTotal: totals.transfer,
      comments
    });
    
    alert("Turno cerrado exitosamente.");
    setDeclaredCashInput('');
    setComments('');
  };

  const handlePrintZ = () => {
    window.print();
  };

  return (
    <div className="p-container-padding flex flex-col md:flex-row gap-8 items-start justify-center max-w-7xl mx-auto min-h-[calc(100vh-64px)] py-12">
      
      {/* Configuration & Steps */}
      <div className="flex-1 w-full space-y-6">
        <div>
          <h1 className="font-h1 text-[32px] text-on-surface mb-2">Cierre de Caja</h1>
          <p className="text-body-md text-slate-500">
            Turno actual (Desde {shiftStart.toLocaleTimeString()}) • Cajero(a)
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h3 className="font-h3 text-h3 text-on-surface mb-1">Verificación de Totales</h3>
            <p className="text-sm text-slate-500">Revise las cifras calculadas por el sistema frente al efectivo real ingresado.</p>
          </div>
          
          <div className="p-6 space-y-6 bg-white">
            <div className="flex justify-between items-center p-4 rounded-xl border border-blue-100 bg-blue-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-on-surface">Efectivo Físico Contado</h4>
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
                  className="font-h2 text-[24px] font-bold text-on-surface bg-white border-2 border-primary/30 rounded-lg px-4 py-2 w-48 text-right outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <div className="space-y-3 px-2">
              <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                <span className="text-on-surface-variant flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-400" /> Tarjetas (Visa, Master)
                </span>
                <span className="font-bold text-on-surface text-lg">${totals.card.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                <span className="text-on-surface-variant flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-slate-400" /> Transferencias / Pago Móvil
                </span>
                <span className="font-bold text-on-surface text-lg">${totals.transfer.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                <span className="text-on-surface-variant flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" /> Mesas Pendientes
                </span>
                <span className={`font-bold text-lg ${mesasPendientes > 0 ? 'text-error' : 'text-secondary'}`}>
                  {mesasPendientes}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Warning card for Difference */}
        {difference !== 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AlertTriangle className="w-6 h-6 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-yellow-800 text-sm">Diferencia de Caja Detectada</h4>
              <p className="text-sm text-yellow-700 mt-1">
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
            <p className="text-slate-500 font-label-caps text-label-caps mb-1">TOTAL DECLARADO (TODOS LOS MÉTODOS)</p>
            <h2 className="font-h1 text-[42px] leading-tight text-on-surface">${totalDeclaredAllMethods.toLocaleString()}</h2>
            <p className={`text-sm font-bold mt-1 ${difference === 0 ? 'text-emerald-500' : 'text-error'}`}>
              Diferencia: ${difference > 0 ? '+' : ''}{difference.toLocaleString()}
            </p>
          </div>
          
          <div className="pt-6 border-t border-slate-100">
            <label className="block text-sm font-bold text-on-surface mb-2">Comentarios de Cierre (Obligatorio si hay dif.)</label>
            <textarea 
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full h-24 p-3 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all placeholder:text-slate-400"
              placeholder="Ej: Faltante de 7.50 por error en dar vuelto mesa 12."
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
             <button onClick={handlePrintZ} className="flex items-center justify-center gap-2 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
               <Printer className="w-5 h-5" /> Imprimir Z
             </button>
             <button 
                onClick={handleConfirmClose}
                className="flex items-center justify-center gap-2 py-3 rounded-lg bg-error text-white font-bold hover:brightness-110 shadow-md transition-all active:scale-95">
               <FileCheck2 className="w-5 h-5" /> Confirmar Cierre
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
