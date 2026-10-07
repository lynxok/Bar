import React from 'react';
import { Bell, X, Info, AlertTriangle, CheckCircle, Settings, Trash2, ShoppingBag } from 'lucide-react';
import { cn } from '../lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  time: string;
  read: boolean;
}

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onRequestDesktop: () => void;
  clientOrders?: any[];
  onApproveOrder?: (id: number) => Promise<void>;
  onRejectOrder?: (id: number) => Promise<void>;
}

export function NotificationsPanel({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onClearAll,
  onRequestDesktop,
  clientOrders,
  onApproveOrder,
  onRejectOrder
}: NotificationsPanelProps) {
  if (!isOpen) return null;

  const pendingOrders = clientOrders?.filter(co => co.status === 'pending') || [];

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#0F6B41]" />
          <h3 className="font-bold text-slate-800 dark:text-white">Notificaciones</h3>
          {(notifications.filter(n => !n.read).length > 0 || pendingOrders.length > 0) && (
            <span className="bg-[#0F6B41] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {notifications.filter(n => !n.read).length + pendingOrders.length} nuevas
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onClearAll}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
            title="Limpiar todo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pending Client Orders Section */}
      {pendingOrders.length > 0 && (
        <div className="bg-amber-50/80 dark:bg-amber-950/40 p-4 border-b border-slate-150 dark:border-white/10 space-y-3">
          <h4 className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            Pedidos QR Pendientes ({pendingOrders.length})
          </h4>
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {pendingOrders.map(order => (
              <div key={order.id} className="bg-white dark:bg-[#182C24] p-3 rounded-2xl border border-amber-200/60 dark:border-white/10 shadow-sm space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-black text-slate-850 dark:text-white">Mesa {order.tableId.replace('T-', '')}</span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-300 font-semibold space-y-0.5">
                  {order.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span>{it.qty}x {it.name}</span>
                      <span>${(it.price * it.qty).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-white/10 pt-2">
                  <span className="font-black text-slate-900 dark:text-white">Total: ${order.total.toLocaleString()}</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onRejectOrder?.(order.id!)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg font-bold text-[10px] transition-all border border-rose-100"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => onApproveOrder?.(order.id!)}
                      className="px-2.5 py-1 bg-[#0F6B41] hover:bg-[#0C5734] text-white rounded-lg font-bold text-[10px] transition-all"
                    >
                      Aprobar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      <div className="max-h-[350px] overflow-y-auto scrollbar-thin">
        {notifications.length === 0 && pendingOrders.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium text-sm">No tienes notificaciones por ahora</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-white/5">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                onClick={() => onMarkAsRead(notification.id)}
                className={cn(
                  "p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group relative",
                  !notification.read && "bg-emerald-50/30 dark:bg-emerald-950/20"
                )}
              >
                {!notification.read && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0F6B41]" />
                )}
                <div className="flex gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
                    notification.type === 'info' && "bg-blue-100 text-blue-600",
                    notification.type === 'warning' && "bg-amber-100 text-amber-600",
                    notification.type === 'success' && "bg-emerald-100 text-emerald-600",
                    notification.type === 'error' && "bg-rose-100 text-rose-600"
                  )}>
                    {notification.type === 'info' && <Info className="w-5 h-5" />}
                    {notification.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                    {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
                    {notification.type === 'error' && <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={cn(
                        "text-sm font-bold truncate",
                        !notification.read ? "text-slate-900" : "text-slate-600"
                      )}>
                        {notification.title}
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {notification.time}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {notification.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 flex flex-col gap-2">
        <button 
          onClick={onRequestDesktop}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-[#0F6B41] hover:bg-emerald-50 dark:hover:bg-white/10 rounded-lg transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Configurar Notificaciones de Escritorio
        </button>
      </div>
    </div>
  );
}
