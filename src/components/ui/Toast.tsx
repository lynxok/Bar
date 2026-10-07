import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string, duration = 3800) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastItem = { id, message, type, title, duration };
    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const confirm = useCallback((opts: ConfirmOptions | string): Promise<boolean> => {
    const options: ConfirmOptions = typeof opts === 'string'
      ? { message: opts, title: 'Confirmación' }
      : { title: 'Confirmación', confirmText: 'Confirmar', cancelText: 'Cancelar', ...opts };

    return new Promise(resolve => {
      setConfirmModal({ options, resolve });
    });
  }, []);

  const closeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleConfirmClose = (result: boolean) => {
    if (confirmModal) {
      confirmModal.resolve(result);
      setConfirmModal(null);
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, confirm }}>
      {children}

      {/* Floating Toasts Viewport */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(toast => {
          const borderClass =
            toast.type === 'success' ? 'border-emerald-600/40 bg-emerald-50/95 text-emerald-950 dark:bg-[#153427] dark:text-emerald-100 dark:border-emerald-700/60' :
            toast.type === 'error' ? 'border-[#C62828]/40 bg-red-50/95 text-red-950 dark:bg-[#3d1313] dark:text-red-100 dark:border-red-700/60' :
            toast.type === 'warning' ? 'border-amber-500/40 bg-amber-50/95 text-amber-950 dark:bg-[#3b2b11] dark:text-amber-100 dark:border-amber-700/60' :
            'border-slate-300 bg-white/95 text-slate-900 dark:bg-[#1E4437] dark:text-slate-100 dark:border-emerald-900/60';

          const Icon =
            toast.type === 'success' ? CheckCircle2 :
            toast.type === 'error' ? AlertCircle :
            toast.type === 'warning' ? AlertTriangle : Info;

          const iconColor =
            toast.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
            toast.type === 'error' ? 'text-[#C62828] dark:text-red-400' :
            toast.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
            'text-[#0F6B41] dark:text-emerald-300';

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto p-4 rounded-xl border shadow-lg backdrop-blur-sm flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-2 ${borderClass}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                {toast.title && <h5 className="font-semibold text-sm leading-tight mb-0.5">{toast.title}</h5>}
                <p className="text-sm font-normal leading-snug">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => closeToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 -mr-1 -mt-1 rounded-md transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1E4437] border border-slate-200 dark:border-emerald-900/60 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold tracking-tight mb-2">
              {confirmModal.options.title || 'Confirmación'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-200 leading-relaxed mb-6">
              {confirmModal.options.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-black/20 transition-colors"
              >
                {confirmModal.options.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className={`min-h-[44px] px-5 py-2 text-sm font-semibold rounded-xl text-white transition-all ${
                  confirmModal.options.isDestructive
                    ? 'bg-[#C62828] hover:bg-red-800 focus:ring-2 focus:ring-red-400'
                    : 'bg-[#0F6B41] hover:bg-emerald-800 focus:ring-2 focus:ring-emerald-400'
                }`}
              >
                {confirmModal.options.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback funcional seguro si se llama fuera del provider (ej. tests)
    return {
      showToast: (msg: string) => console.log('[Toast]', msg),
      confirm: async (opts: ConfirmOptions | string) => {
        const msg = typeof opts === 'string' ? opts : opts.message;
        return typeof window !== 'undefined' ? window.confirm(msg) : true;
      },
    };
  }
  return ctx;
}
