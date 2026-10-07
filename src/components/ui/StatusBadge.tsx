import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export type StatusVariant = 
  | 'available' 
  | 'occupied' 
  | 'kitchen' 
  | 'consuming' 
  | 'billing' 
  | 'dirty' 
  | 'success' 
  | 'warning' 
  | 'danger' 
  | 'neutral';

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant: StatusVariant;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function StatusBadge({ variant, icon, children, className, ...props }: StatusBadgeProps) {
  const styles: Record<StatusVariant, string> = {
    // Mesas
    available: 'bg-white text-[#0F6B41] border border-[#0F6B41]/40',
    occupied: 'bg-emerald-50 text-[#0F6B41] border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    kitchen: 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    consuming: 'bg-[#0F6B41] text-white border border-[#0F6B41]',
    billing: 'bg-[#FA4515] text-white border border-[#FA4515]',
    dirty: 'bg-slate-100 text-slate-600 border border-slate-300 dark:bg-white/10 dark:text-slate-300 dark:border-white/20',
    // Estados generales
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    danger: 'bg-rose-50 text-[#C62828] border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold select-none',
        styles[variant],
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
