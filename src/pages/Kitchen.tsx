import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../contexts/StoreContext';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  Play, 
  Check, 
  UtensilsCrossed,
  Volume2,
  VolumeX,
  Filter
} from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Kitchen() {
  const { comandas, updateComandaStatus, products } = useStore();
  const [filter, setFilter] = useState<'pending' | 'preparing' | 'ready'>('pending');
  const [selectedStation, setSelectedStation] = useState<string>('Todas');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Store last comanda count to detect new items and trigger alert sound
  const prevComandasCount = useRef<number>(0);

  // Filter out delivered orders
  const activeComandas = comandas.filter(c => c.status !== 'delivered');

  // Trigger sound when count of active comandas increases
  useEffect(() => {
    if (activeComandas.length > prevComandasCount.current) {
      if (soundEnabled && prevComandasCount.current > 0) {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.15);

          setTimeout(() => {
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime); // A5 note
            gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.25);
          }, 150);
        } catch (e) {
          console.error("Audio Context failed to start:", e);
        }
      }
    }
    prevComandasCount.current = activeComandas.length;
  }, [activeComandas.length, soundEnabled]);

  // Dynamically build stations/categories from products
  const stations = ['Todas', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // Helper to check if any item of the comanda matches selected category/station
  const comandaMatchesStation = (comanda: any) => {
    if (selectedStation === 'Todas') return true;
    return comanda.items.some((item: any) => {
      const prod = products.find(p => p.name === item.name);
      return prod && prod.category === selectedStation;
    });
  };

  // Filter items inside a comanda card based on selected station
  const getFilteredItems = (items: any[]) => {
    if (selectedStation === 'Todas') return items;
    return items.filter(item => {
      const prod = products.find(p => p.name === item.name);
      return prod && prod.category === selectedStation;
    });
  };

  const filteredComandas = activeComandas
    .filter(comandaMatchesStation)
    .filter(c => {
      if (filter === 'ready') return c.status === 'ready';
      return c.status === 'pending' || c.status === 'preparing';
    });

  const stats = {
    pending: activeComandas.filter(comandaMatchesStation).filter(c => c.status === 'pending').length,
    preparing: activeComandas.filter(comandaMatchesStation).filter(c => c.status === 'preparing').length,
    ready: activeComandas.filter(comandaMatchesStation).filter(c => c.status === 'ready').length,
  };

  const getStatusColor = (status: string, timestamp: string) => {
    if (status === 'ready') return {
      card: 'border-green-500 bg-white border-2',
      header: 'bg-green-500 text-white border-green-500',
      title: 'text-white',
      clock: 'text-green-100',
      badge: 'bg-white text-green-700'
    };
    
    const minutes = (Date.now() - new Date(timestamp).getTime()) / 60000;
    
    if (minutes > 12) return {
      card: 'border-red-600 border-[3px] bg-white shadow-xl shadow-red-100/50 animate-pulse',
      header: 'bg-red-600 text-white border-red-600',
      title: 'text-white font-black',
      clock: 'text-red-100 font-bold',
      badge: 'bg-white text-red-600'
    };
    if (minutes >= 5) return {
      card: 'border-amber-500 border-2 bg-white',
      header: 'bg-amber-500 text-white border-amber-500',
      title: 'text-white',
      clock: 'text-amber-100',
      badge: 'bg-white text-amber-600'
    };
    return {
      card: 'border-emerald-500 border-2 bg-white',
      header: 'bg-emerald-500 text-white border-emerald-500',
      title: 'text-white',
      clock: 'text-emerald-100',
      badge: 'bg-white text-emerald-700'
    };
  };

  const getStatusBadge = (status: string, customClass?: string) => {
    if (customClass) {
      const label = status === 'pending' ? 'Pendiente' : status === 'preparing' ? 'Preparando' : 'Listo';
      return <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", customClass)}>{label}</span>;
    }
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Monitor de Cocina (KDS)</h1>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-0.5">Estación activa: <span className="text-indigo-600">{selectedStation}</span></p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sound toggle button */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              "p-3 rounded-xl border transition-all shadow-sm active:scale-95",
              soundEnabled ? "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100" : "bg-slate-50 border-slate-200 text-slate-400"
            )}
            title={soundEnabled ? "Silenciar notificaciones" : "Activar sonido"}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Dynamic Station/Category selection dropdown */}
          <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="bg-transparent outline-none cursor-pointer pr-4 font-bold"
            >
              {stations.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setFilter('pending')}
              className={cn(
                "px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-wide",
                filter === 'pending' ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-600 hover:bg-slate-200"
              )}
            >
              Pendientes
              <span className={cn("px-1.5 rounded text-[10px] font-black", filter === 'pending' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700")}>{stats.pending}</span>
            </button>
            <button 
              onClick={() => setFilter('preparing')}
              className={cn(
                "px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-wide",
                filter === 'preparing' ? "bg-orange-500 text-white shadow-md shadow-orange-100" : "text-slate-600 hover:bg-slate-200"
              )}
            >
              En Marcha
              <span className={cn("px-1.5 rounded text-[10px] font-black", filter === 'preparing' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700")}>{stats.preparing}</span>
            </button>
            <button 
              onClick={() => setFilter('ready')}
              className={cn(
                "px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-wide",
                filter === 'ready' ? "bg-green-600 text-white shadow-md shadow-green-100" : "text-slate-600 hover:bg-slate-200"
              )}
            >
              Listos
              <span className={cn("px-1.5 rounded text-[10px] font-black", filter === 'ready' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700")}>{stats.ready}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredComandas.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-300">
            <UtensilsCrossed className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-bold">No hay pedidos en esta sección</p>
            <p className="text-sm">¡Buen trabajo! La estación está al día.</p>
          </div>
        ) : (
          filteredComandas
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
              .map((order) => {
                const cardItems = getFilteredItems(order.items);
                if (cardItems.length === 0) return null;
                const styles = getStatusColor(order.status, order.timestamp);

                return (
                  <div 
                    key={order.id} 
                    className={cn(
                      "flex flex-col rounded-3xl overflow-hidden transition-all shadow-sm",
                      styles.card
                    )}
                  >
                    {/* Card Header Banner */}
                    <div className={cn("p-4 flex justify-between items-start border-b transition-all", styles.header)}>
                      <div>
                        <h3 className={cn("font-black text-lg leading-none mb-1", styles.title)}>
                          {order.tableId.startsWith('T-') ? `MESA ${order.tableId.split('-')[1]}` : 'POS / LLEVAR'}
                        </h3>
                        <div className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase", styles.clock)}>
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(order.timestamp), { addSuffix: true, locale: es })}
                        </div>
                      </div>
                      {getStatusBadge(order.status, styles.badge)}
                    </div>

                    {/* Items List */}
                    <div className="p-4 flex-1 space-y-3 bg-white">
                      {cardItems.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-start group">
                          <div className="flex gap-3">
                            <span className="flex items-center justify-center w-6 h-6 bg-slate-100 text-slate-800 rounded-lg font-black text-xs">
                              {item.qty}
                            </span>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800 text-sm leading-tight uppercase">{item.name}</span>
                              {item.notes && (
                                <span className="text-sm font-extrabold bg-amber-400 text-slate-900 border border-amber-500 px-2 py-1 rounded-md mt-1.5 block shadow-sm">
                                  ⚠️ {item.notes}
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
              );
            })
        )}
      </div>
    </div>
  );
}
