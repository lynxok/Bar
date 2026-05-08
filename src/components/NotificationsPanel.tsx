import React from 'react';
import { Bell, X, Info, AlertTriangle, CheckCircle, Settings, Trash2 } from 'lucide-react';
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
}

export function NotificationsPanel({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onClearAll,
  onRequestDesktop
}: NotificationsPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800">Notificaciones</h3>
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {notifications.filter(n => !n.read).length} nuevas
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onClearAll}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            title="Limpiar todo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[450px] overflow-y-auto scrollbar-thin">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium text-sm">No tienes notificaciones por ahora</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                onClick={() => onMarkAsRead(notification.id)}
                className={cn(
                  "p-4 hover:bg-slate-50 transition-colors cursor-pointer group relative",
                  !notification.read && "bg-indigo-50/30"
                )}
              >
                {!notification.read && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
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
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2">
        <button 
          onClick={onRequestDesktop}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Configurar Notificaciones de Escritorio
        </button>
      </div>
    </div>
  );
}
