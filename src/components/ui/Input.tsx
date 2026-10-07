import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'min-h-[44px] px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none',
            'bg-white dark:bg-[#182C24] text-slate-900 dark:text-white',
            'border-slate-300 dark:border-white/15',
            'focus:border-[#0F6B41] focus:ring-2 focus:ring-[#0F6B41]/20',
            error && 'border-[#C62828] focus:border-[#C62828] focus:ring-[#C62828]/20',
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-xs font-semibold text-[#C62828]">{error}</span>
        )}
        {helperText && !error && (
          <span className="text-xs text-slate-500 dark:text-slate-400">{helperText}</span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
