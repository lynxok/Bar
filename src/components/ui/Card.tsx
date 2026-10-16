import type { ReactNode, HTMLAttributes, MouseEventHandler } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'default' | 'flat' | 'elevated' | 'brand';
  children?: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  const variants = {
    default: 'bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 shadow-sm',
    flat: 'bg-slate-50 dark:bg-dark-subtle border border-slate-200 dark:border-white/5',
    elevated: 'bg-white dark:bg-dark-card-elevated border border-slate-200 dark:border-white/10 shadow-lg',
    brand: 'bg-brand-dark text-white border border-brand/40 shadow-md',
  };

  return (
    <div
      className={cn('rounded-2xl transition-all', variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}
