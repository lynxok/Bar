import React, { useState, useMemo } from 'react';
import { summarizeShift } from '../lib/payments';
import { useStore } from '../contexts/StoreContext';
import { formatMoney } from '../lib/format';
import { useToast } from '../components/ui/Toast';
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
  HelpCircle,
  Sparkles
} from "lucide-react";


export function CashClose() {
  const { orders, tables, openShift, closeShift, activeShift, shifts } = useStore();
  const { showToast, confirm } = useToast();
  
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
    // QR, billetera y Mercado Pago cuentan como digitales (no como efectivo)
    return summarizeShift(currentShiftOrders, 0);
  }, [currentShiftOrders]);
  const tips = totals.tips;

  const mesasPendientes = tables.filter(t => t.status !== 'available' && t.status !== 'dirty').length;
  
  const hasDeclaredCash = declaredCashInput.trim().length > 0;
  const declaredCash = parseFloat(declaredCashInput.replace(/[^0-9.-]+/g,"")) || 0;
  const initialCash = activeShift ? activeShift.initialCash : 0;
  // Las propinas en efectivo también quedan en la caja
  const expectedCash = initialCash + totals.sales.cash + tips.cash;
  const difference = hasDeclaredCash ? declaredCash - expectedCash : 0;
  const totalDeclaredAllMethods = (hasDeclaredCash ? declaredCash : 0) + totals.sales.card + totals.sales.transfer;

  const handleOpenShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const initCash = parseFloat(initialCashInput) || 0;
    if (initCash < 0) {
      showToast("El fondo inicial no puede ser negativo.", "warning");
      return;
    }
    try {
      await openShift(cashierNameInput, initCash);
      showToast("Turno abierto exitosamente.", "success");
    } catch (err: any) {
      showToast(err.message || "Error al abrir turno", "error");
    }
  };

  const handleConfirmClose = async () => {
    if (!activeShift) return;
    if (mesasPendientes > 0) {
      showToast(`No podés cerrar caja con ${mesasPendientes} mesas activas en el salón.`, "warning");
      return;
    }
    if (!hasDeclaredCash) {
      showToast("Ingresá el efectivo contado antes de cerrar el turno.", "warning");
      return;
    }
    if (difference !== 0 && !comments.trim()) {
      showToast("Ingresá un comentario justificando la diferencia de caja.", "warning");
      return;
    }
    const ok = await confirm({
      title: "¿Cerrar turno de caja?",
      message: "¿Confirmás el cierre del turno actual? Se asentarán los montos declarados.",
      confirmText: "Cerrar Turno",
    });
    if (!ok) return;

    try {
      await closeShift(declaredCash, comments);
      showToast("Turno cerrado exitosamente.", "success");
      setDeclaredCashInput('');
      setComments('');
    } catch (err: any) {
      showToast(err.message || "Error al cerrar turno", "error");
    }
  };


  const handlePrintZ = () => {
    window.print();
  };

  // Render Opening View if there's no activeShift
  if (!activeShift) {
    return (
      <div className="p-container-padding flex flex-col items-center justify-center max-w-xl mx-auto min-h-[calc(100vh-64px)] py-12">
        <div className="bg-white dark:bg-[#182C24] rounded-3xl border border-slate-200 dark:border-white/10 p-8 w-full shadow-lg space-y-6 text-center">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-[#0F6B41]/20 text-[#0F6B41] dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
            <PlayCircle className="w-8 h-8" />
          </div>
          <div>
            <h1 className="font-bold text-2xl text-slate-900 dark:text-white">Apertura de caja</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Declarar el fondo inicial antes de iniciar las ventas del turno.</p>
          </div>

          <form onSubmit={handleOpenShiftSubmit} className="space-y-4 text-left pt-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Nombre del operador (cajero)</label>
              <input
                required
                type="text"
                value={cashierNameInput}
                onChange={(e) => setCashierNameInput(e.target.value)}
                className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 font-semibold text-slate-900 dark:text-white focus:border-[#0F6B41] focus:ring-2 focus:ring-[#0F6B41]/20 outline-none transition-all"
                placeholder="Nombre del cajero..."
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Fondo de caja inicial (efectivo)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg dark:text-zinc-400">$</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={initialCashInput}
                  onChange={(e) => setInitialCashInput(e.target.value)}
                  className="w-full h-12 pl-8 pr-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-slate-900 dark:text-white focus:border-[#0F6B41] focus:ring-2 focus:ring-[#0F6B41]/20 outline-none transition-all"
                  placeholder="0,00"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-14 bg-[#0F6B41] hover:bg-[#0C5734] text-white rounded-xl font-semibold text-sm uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 pt-1 cursor-pointer"
            >
              Iniciar turno / Abrir caja
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
          <h1 className="font-bold text-[32px] text-slate-900 mb-2 dark:text-zinc-100">Cierre de Caja</h1>
          <p className="text-body-md text-slate-500 dark:text-zinc-400">
            Turno actual (Desde {shiftStart?.toLocaleTimeString()} - {shiftStart?.toLocaleDateString()}) • Operador: <span className="font-bold text-slate-800 dark:text-zinc-100">{activeShift.cashierName}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm dark:bg-[var(--bg-surface)] dark:border-white/10">
          <div className="p-6 border-b border-slate-100 bg-slate-50 dark:border-white/10 dark:bg-[var(--color-paper-subtle)]">
            <h3 className="font-bold text-lg text-slate-800 mb-1 dark:text-zinc-100">Verificación de Totales</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400">Revise las cifras calculadas por el sistema frente al efectivo real ingresado.</p>
          </div>
          
          <div className="p-6 space-y-6 bg-white dark:bg-[var(--bg-surface)]">
            <div className="flex justify-between items-center p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-[#0F6B41]/20 rounded-lg flex items-center justify-center text-[#0F6B41] dark:text-emerald-400">
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-white">Efectivo físico contado</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Entrada manual requerida</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className="text-slate-400 font-bold text-xl dark:text-zinc-400">$</span>
                <input 
                  type="number"
                  placeholder="0,00"
                  value={declaredCashInput}
                  onChange={(e) => setDeclaredCashInput(e.target.value)}
                  className="font-bold text-[24px] text-slate-800 dark:text-white bg-white dark:bg-[#182C24] border-2 border-slate-300 dark:border-white/20 rounded-lg px-4 py-2 w-48 text-right outline-none focus:border-[#0F6B41] transition-all tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-3 px-2">
              <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200 dark:border-white/10">
                <span className="text-slate-600 flex items-center gap-2 font-medium dark:text-zinc-300">
                  <Banknote className="w-4 h-4 text-slate-400 dark:text-zinc-400" /> Fondo de Caja Inicial
                </span>
                <span className="font-bold text-slate-800 text-lg tabular-nums dark:text-zinc-100">{formatMoney(initialCash)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200 dark:border-white/10">
                <span className="text-slate-600 flex items-center gap-2 font-medium dark:text-zinc-300">
                  <Banknote className="w-4 h-4 text-slate-400 dark:text-zinc-400" /> Ventas Efectivo Turno
                </span>
                <span className="font-bold text-slate-800 text-lg tabular-nums dark:text-zinc-100">{formatMoney(totals.sales.cash)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200 dark:border-white/10">
                <span className="text-slate-600 flex items-center gap-2 font-medium dark:text-zinc-300">
                  <CreditCard className="w-4 h-4 text-slate-400 dark:text-zinc-400" /> Tarjetas (Visa, Master)
                </span>
                <span className="font-bold text-slate-800 text-lg tabular-nums dark:text-zinc-100">{formatMoney(totals.sales.card)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200 dark:border-white/10">
                <span className="text-slate-600 flex items-center gap-2 font-medium dark:text-zinc-300">
                  <Landmark className="w-4 h-4 text-slate-400 dark:text-zinc-400" /> Transferencias / Pago Móvil
                </span>
                <span className="font-bold text-slate-800 text-lg tabular-nums dark:text-zinc-100">{formatMoney(totals.sales.transfer)}</span>
              </div>
              {tips.total > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200 dark:border-white/10">
                  <span className="text-slate-600 flex items-center gap-2 font-medium dark:text-zinc-300">
                    <Landmark className="w-4 h-4 text-slate-400 dark:text-zinc-400" /> Propinas (no son venta)
                  </span>
                  <span className="text-right">
                    <span className="font-bold text-slate-800 text-lg tabular-nums dark:text-zinc-100">{formatMoney(tips.total)}</span>
                    <span className="block text-[11px] text-slate-500 dark:text-zinc-400">en efectivo: {formatMoney(tips.cash)} (incluidas en la caja)</span>
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200 dark:border-white/10">
                <span className="text-slate-600 flex items-center gap-2 font-medium dark:text-zinc-300">
                  <Clock className="w-4 h-4 text-slate-400 dark:text-zinc-400" /> Mesas Activas / Abiertas
                </span>
                <span className={`font-bold text-lg ${mesasPendientes > 0 ? 'text-[#C62828] animate-pulse' : 'text-[#0F6B41]'}`}>
                  {mesasPendientes}
                </span>
              </div>

              {/* Línea destacada: Efectivo esperado en caja */}
              <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-[#1E4437]/40 border border-[#0F6B41]/30 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0F6B41] dark:text-emerald-300 block">
                    Efectivo esperado en caja
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-300">
                    Fondo inicial + ventas en efectivo + propinas en efectivo
                  </span>
                </div>
                <span className="font-bold text-[#0F6B41] dark:text-emerald-300 text-2xl tabular-nums">
                  {formatMoney(expectedCash)}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Info or Warning card for Difference */}
        {!hasDeclaredCash ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-4 animate-in fade-in duration-200 dark:bg-[var(--color-paper-subtle)] dark:border-white/10">
            <Banknote className="w-6 h-6 text-slate-500 shrink-0 mt-0.5 dark:text-zinc-400" />
            <div>
              <h4 className="font-semibold text-slate-800 text-sm dark:text-zinc-100">Ingresá el efectivo contado</h4>
              <p className="text-sm text-slate-600 mt-1 dark:text-zinc-300">
                Contá los billetes en caja y cargá el monto arriba para calcular el arqueo y balancear el turno.
              </p>
            </div>
          </div>
        ) : difference !== 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-800 text-sm">Diferencia de Caja Detectada</h4>
              <p className="text-sm text-amber-700 mt-1">
                El sistema indica que deberían haber <b>{formatMoney(expectedCash)}</b> en efectivo. Detectada una diferencia de <b>{difference > 0 ? '+' : ''}{formatMoney(difference)}</b>. 
                Deberás justificar esta diferencia con un comentario antes de cerrar el turno.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-4 animate-in fade-in duration-200">
            <FileCheck2 className="w-6 h-6 text-[#0F6B41] shrink-0 mt-0.5 dark:text-emerald-400" />
            <div>
              <h4 className="font-bold text-[#0F6B41] text-sm dark:text-emerald-400">Caja cuadrada</h4>
              <p className="text-sm text-emerald-800 mt-0.5">
                El efectivo declarado coincide exactamente con el efectivo esperado ({formatMoney(expectedCash)}).
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Summary Card */}
      <div className="w-full md:w-[400px] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden sticky top-8 dark:bg-[var(--bg-surface)] dark:border-white/10">
        <div className="bg-[#1E4437] text-white p-6 text-center relative">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20 relative z-10 mt-6">
             <LockIcon className="w-8 h-8 text-white mt-1" />
          </div>
          <h2 className="text-[20px] font-bold text-center relative z-10">Resumen de Cierre</h2>
          <p className="text-emerald-200 text-sm mt-1 text-center mb-6 relative z-10 font-medium">Turno #{shifts.length + 1}</p>
        </div>
        
        <div className="p-6 bg-white space-y-6 dark:bg-[var(--bg-surface)]">
          <div className="text-center">
            <p className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-1 dark:text-zinc-400">TOTAL DECLARADO (TODOS LOS MÉTODOS)</p>
            <h2 className="font-bold text-[38px] leading-tight text-slate-800 tabular-nums dark:text-zinc-100">{formatMoney(totalDeclaredAllMethods)}</h2>
            {hasDeclaredCash ? (
              <p className={`text-sm font-bold mt-1 ${difference === 0 ? 'text-[#0F6B41]' : 'text-[#C62828]'}`}>
                Diferencia: {difference > 0 ? '+' : ''}{formatMoney(difference)}
              </p>
            ) : (
              <p className="text-sm font-medium mt-1 text-slate-500 dark:text-zinc-400">
                Ingresá el efectivo contado
              </p>
            )}
          </div>

          
          <div className="pt-6 border-t border-slate-100 dark:border-white/10">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 dark:text-zinc-400">Comentarios de cierre (obligatorio si hay diferencia)</label>
            <textarea 
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full h-24 p-3 border border-slate-300 dark:border-white/10 rounded-xl text-sm bg-slate-50 dark:bg-white/5 focus:ring-2 focus:ring-[#0F6B41]/20 focus:border-[#0F6B41] focus:bg-white dark:focus:bg-[#182C24] text-slate-800 dark:text-white outline-none transition-all placeholder:text-slate-400 font-medium"
              placeholder="Ej: Faltante de 7.50 por error en dar vuelto mesa 12."
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
             <button onClick={handlePrintZ} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
               <Printer className="w-5 h-5" /> Imprimir Z
             </button>
             <button 
                onClick={handleConfirmClose}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#C62828] hover:bg-[#a82020] text-white font-semibold shadow-sm transition-all active:scale-95 text-sm uppercase tracking-wider cursor-pointer">
               <FileCheck2 className="w-5 h-5" /> Confirmar cierre
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
