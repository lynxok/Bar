import React, { useState, useEffect } from 'react';
import { useStore } from '../contexts/StoreContext';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  Play, 
  Check, 
  AlertCircle,
  Timer,
  UtensilsCrossed
} from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Kitchen() {
  const { comandas, updateComandaStatus } = useStore();
  const [filter, setFilter] = useState<'pending' | 'preparing' | 'ready'>('pending');

  // Filter out delivered orders
  const activeComandas = comandas.filter(c => c.status !== 'delivered');
  
  // Stats
  const stats = {
    pending: activeComandas.filter(c => c.status === 'pending').length,
    preparing: activeComandas.filter(c => c.status === 'preparing').length,
    ready: activeComandas.filter(c => c.status === 'ready').length,
  };

  const getStatusColor = (status: string, timestamp: string) => {
    if (status === 'ready') return 'border-green-500 bg-green-50';
    
    const minutes = (Date.now() - new Date(timestamp).getTime()) / 60000;
    if (minutes > 20) return 'border-red-500 bg-red-50 animate-pulse';
    if (minutes > 10) return 'border-orange-500 bg-orange-50';
    return 'border-indigo-500 bg-white';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold uppercase">Pendiente</span>;
      case 'preparing': return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold uppercase animate-pulse">Preparando</span>;
      case 'ready': return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase">Listo</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ChefHat className="w-8 h-8 text-indigo-600" />
            Monitor de Cocina (KDS)
          </h1>
          <p className="text-slate-500 font-medium">Gestión de pedidos en tiempo real.</p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setFilter('pending')}
            className={cn(
              "px-4 py-2 rounded-xl border transition-all flex items-center gap-2 font-bold text-sm",
              filter === 'pending' ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            Pendientes
            <span className="bg-white/20 px-1.5 rounded text-xs">{stats.pending}</span>
          </button>
          <button 
            onClick={() => setFilter('preparing')}
            className={cn(
              "px-4 py-2 rounded-xl border transition-all flex items-center gap-2 font-bold text-sm",
              filter === 'preparing' ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            En Marcha
            <span className="bg-white/20 px-1.5 rounded text-xs">{stats.preparing}</span>
          </button>
          <button 
            onClick={() => setFilter('ready')}
            className={cn(
              "px-4 py-2 rounded-xl border transition-all flex items-center gap-2 font-bold text-sm",
              filter === 'ready' ? "bg-green-600 border-green-600 text-white shadow-lg shadow-green-200" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            Listos
            <span className="bg-white/20 px-1.5 rounded text-xs">{stats.ready}</span>
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {activeComandas.filter(c => filter === 'ready' ? c.status === 'ready' : c.status !== 'ready').length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-300">
            <UtensilsCrossed className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-bold">No hay pedidos en esta sección</p>
            <p className="text-sm">¡Buen trabajo! La cocina está al día.</p>
          </div>
        ) : (
          activeComandas
            .filter(c => {
              if (filter === 'ready') return c.status === 'ready';
              return c.status === 'pending' || c.status === 'preparing';
            })
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .map((order) => (
              <div 
                key={order.id} 
                className={cn(
                  "flex flex-col border-2 rounded-3xl overflow-hidden transition-all shadow-sm",
                  getStatusColor(order.status, order.timestamp)
                )}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-inherit flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-slate-800 text-lg leading-none mb-1">
                      {order.tableId.startsWith('T-') ? `MESA ${order.tableId.split('-')[1]}` : 'POS / LLEVAR'}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(order.timestamp), { addSuffix: true, locale: es })}
                    </div>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                {/* Items List */}
                <div className="p-4 flex-1 space-y-3">
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start group">
                      <div className="flex gap-3">
                        <span className="flex items-center justify-center w-6 h-6 bg-slate-100 text-slate-800 rounded-lg font-black text-xs">
                          {item.qty}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-sm leading-tight uppercase">{item.name}</span>
                          {item.notes && (
                            <span className="text-[10px] text-red-500 font-bold bg-red-50 px-1 rounded mt-0.5">
                              * {item.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-white/50 mt-auto border-t border-inherit">
                  {order.status === 'pending' && (
                    <button 
                      onClick={() => updateComandaStatus(order.id, 'preparing')}
                      className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Empezar Preparación
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button 
                      onClick={() => updateComandaStatus(order.id, 'ready')}
                      className="w-full py-3 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-100"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Marcar como Listo
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button 
                      onClick={() => updateComandaStatus(order.id, 'delivered')}
                      className="w-full py-3 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                    >
                      <Check className="w-4 h-4" />
                      Entregar Pedido
                    </button>
                  )}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
