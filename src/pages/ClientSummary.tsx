import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../contexts/StoreContext';
import { Utensils, Receipt, ShoppingBag, ArrowLeft, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

export function ClientSummary() {
  const { tableId } = useParams<{ tableId: string }>();
  const { tables } = useStore();
  
  const table = tables.find(t => t.id === tableId);
  const order = table?.order || [];
  const total = order.reduce((acc, i) => acc + (i.price * i.qty), 0);

  if (!table) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Utensils className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Mesa no encontrada</h1>
        <p className="text-slate-500 mt-2">Por favor, escanea el código QR de tu mesa nuevamente.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Mobile Header */}
      <header className="bg-white px-6 py-4 border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Tu Consumo</h1>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" /> Mesa {tableId} • Actualizado hace instantes
            </p>
          </div>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
            {tableId?.split('-')[1]}
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        {/* Status Card */}
        <div className={cn(
          "p-4 rounded-2xl border flex items-center gap-4",
          order.length > 0 ? "bg-emerald-50 border-emerald-100" : "bg-slate-100 border-slate-200"
        )}>
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            order.length > 0 ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400"
          )}>
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">
              {order.length > 0 ? 'Pedido en Curso' : 'Mesa Vacía'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {order.length > 0 ? `${order.length} items registrados` : 'Aún no has pedido nada'}
            </p>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Detalle del Ticket</h3>
          </div>
          
          <div className="divide-y divide-slate-100">
            {order.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-sm">No hay consumos registrados aún.</p>
              </div>
            ) : (
              order.map((item, idx) => (
                <div key={idx} className="p-4 flex justify-between items-center">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">
                      {item.qty}x
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{item.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">${item.price} c/u</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 text-sm">${(item.price * item.qty).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {order.length > 0 && (
            <div className="p-6 bg-slate-900 text-white">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Total Parcial</span>
                <span className="text-2xl font-bold text-white">${total.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3">
          <div className="p-2 bg-white rounded-lg h-fit shadow-sm">
            <Utensils className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xs text-indigo-800 font-medium leading-relaxed">
            Este es un resumen de tu consumo actual. Para pedir algo más o solicitar la cuenta, por favor llama al mozo.
          </p>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="p-8 text-center text-slate-400">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1">GastroAnalytics</p>
        <p className="text-[9px]">Powered by LYNX Technology</p>
      </footer>
    </div>
  );
}
