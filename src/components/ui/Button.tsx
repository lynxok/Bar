import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all select-none cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

    const sizes = {
      sm: 'min-h-[36px] px-3 py-1.5 text-xs gap-1.5',
      md: 'min-h-[44px] px-4 py-2 text-sm gap-2',
      lg: 'min-h-[50px] px-6 py-3 text-base gap-2.5',
    };

    const variants = {
      // Primario verde marca (#0F6B41) con texto blanco (contraste ~6.5:1)
      primary: 'bg-[#0F6B41] hover:bg-[#0C5734] active:bg-[#094328] text-white shadow-sm hover:shadow',
      // Acento naranja (#FA4515) para CTA de alto impacto ("Cobrar")
      accent: 'bg-[#FA4515] hover:bg-[#E03A0E] text-white shadow-md hover:shadow-lg',
      // Secundario sutil
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white',
      // Peligro rojo semántico (#C62828)
      danger: 'bg-[#C62828] hover:bg-[#A82020] text-white shadow-sm',
      // Fantasma sin fondo
      ghost: 'hover:bg-slate-100 text-slate-700 dark:text-slate-200 dark:hover:bg-white/10',
      // Borde
      outline: 'border border-slate-300 hover:bg-slate-50 text-slate-800 dark:border-white/20 dark:text-white dark:hover:bg-white/5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(base, sizes[size], variants[variant], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
