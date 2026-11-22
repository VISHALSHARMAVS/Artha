import React from 'react';
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react';

export interface BadgeProps {
  variant?: 'income' | 'expense' | 'transfer' | 'neutral' | 'warning' | 'success';
  children: React.ReactNode;
  icon?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  icon = false,
  className = '',
}) => {
  const styles = {
    income: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/50',
    expense: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200/60 dark:border-red-800/50',
    transfer: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/50',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/50',
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${styles[variant]} ${className}`}
    >
      {icon && variant === 'income' && <ArrowUpRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
      {icon && variant === 'expense' && <ArrowDownLeft className="w-3 h-3 text-red-600 dark:text-red-400" />}
      {icon && variant === 'transfer' && <ArrowLeftRight className="w-3 h-3 text-slate-500" />}
      {children}
    </span>
  );
};
