import React, { useState, useEffect } from 'react';
import { useStore } from '../contexts/StoreContext';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Timer,
  ChevronRight,
  Monitor,
  LayoutGrid,
  Bell
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function KDS() {
  const { tables, updateTable } = useStore();
  const [filter, setFilter] = useState<'all' | 'pending' | 'ready'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter tables that have an active order
  const tablesWithOrders = tables.filter(t => t.order && t.order.length > 0 && t.status !== 'available' && t.status !== 'dirty');

  const handleMarkItemReady = (tableId: string, itemId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const newOrder = table.order.map(item => {
      if (item.id === itemId) {
        return { ...item, status: 'ready' as const };
      }
      return item;
    });

    updateTable(tableId, { order: newOrder });
  };

  const handleMarkAllReady = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const newOrder = table.order.map(item => ({ ...item, status: 'ready' as const }));
    updateTable(tableId, { order: newOrder, status: 'consuming' });
  };

  return (
    <div className="space-y-6 min-h-[calc(100vh-12rem)] pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Kitchen Display System</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Monitor de pedidos en tiempo real</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
            <button 
              onClick={() => setFilter('all')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                filter === 'all' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilter('pending')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                filter === 'pending' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Pendientes
            </button>
          </div>

          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex ml-2">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'grid' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'list' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500"
              )}
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {tablesWithOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-300 dark:border-slate-800">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
            <ChefHat className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Sin pedidos activos</h3>
          <p className="text-slate-500 dark:text-slate-400">Los nuevos pedidos aparecerán aquí automáticamente.</p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-6",
          viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
        )}>
          <AnimatePresence>
            {tablesWithOrders.map((table) => {
              const pendingItems = table.order.filter(i => i.status !== 'ready');
              const readyItems = table.order.filter(i => i.status === 'ready');
              
              if (filter === 'pending' && pendingItems.length === 0) return null;

              const elapsedMinutes = table.lastUpdate 
                ? Math.floor((Date.now() - new Date(table.lastUpdate).getTime()) / 60000)
                : 0;

              const priorityColor = elapsedMinutes > 20 ? "border-rose-500 bg-rose-50 dark:bg-rose-950/20" : 
                                  elapsedMinutes > 10 ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : 
                                  "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={table.id}
                  className={cn(
                    "rounded-[2.5rem] border-2 overflow-hidden shadow-sm flex flex-col",
                    priorityColor
                  )}
                >
                  {/* Card Header */}
                  <div className={cn(
                    "p-6 flex items-center justify-between border-b",
                    elapsedMinutes > 20 ? "border-rose-200 dark:border-rose-900/50" : 
                    elapsedMinutes > 10 ? "border-amber-200 dark:border-amber-900/50" : 
                    "border-slate-100 dark:border-slate-800"
                  )}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">Mesa {table.id}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400">
                          {table.waiterName || 'Mozo'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className={cn("w-3 h-3", elapsedMinutes > 15 ? "text-rose-500" : "text-slate-400")} />
                        <span className={cn("text-xs font-black", elapsedMinutes > 15 ? "text-rose-600" : "text-slate-500")}>
                          {elapsedMinutes} min
                        </span>
                      </div>
                    </div>
                    {pendingItems.length === 0 ? (
                      <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black">
                        {pendingItems.length}
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="flex-1 p-6 space-y-4">
                    {pendingItems.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pendientes</p>
                        {pendingItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleMarkItemReady(table.id, item.id)}
                            className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-2xl group transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg text-sm font-black text-slate-900 dark:text-white shadow-sm">
                                {item.qty}
                              </span>
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {item.name}
                              </span>
                            </div>
                            <div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700 group-hover:border-indigo-500 flex items-center justify-center transition-all">
                              <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-indigo-500" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {readyItems.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Listos</p>
                        {readyItems.map((item) => (
                          <div
                            key={item.id}
                            className="w-full flex items-center justify-between p-3 opacity-60 grayscale-[0.5]"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-sm font-black text-emerald-600 dark:text-emerald-400">
                                {item.qty}
                              </span>
                              <span className="text-sm font-bold text-slate-500 dark:text-slate-400 line-through">
                                {item.name}
                              </span>
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Footer */}
                  <div className="p-6 pt-0 mt-auto">
                    <button
                      onClick={() => handleMarkAllReady(table.id)}
                      disabled={pendingItems.length === 0}
                      className={cn(
                        "w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                        pendingItems.length === 0 
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20" 
                          : "bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 active:scale-95"
                      )}
                    >
                      {pendingItems.length === 0 ? (
                        <>COMPLETADO <CheckCircle2 className="w-4 h-4" /></>
                      ) : (
                        <>MARCAR TODO LISTO <ChevronRight className="w-4 h-4" /></>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
