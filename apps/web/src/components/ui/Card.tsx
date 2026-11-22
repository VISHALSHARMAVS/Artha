import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  className = '',
  ...props
}) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-card transition-colors ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  highlight?: 'default' | 'income' | 'expense' | 'accent';
  className?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  badge,
  highlight = 'default',
  className = '',
  onClick,
}) => {
  const borderHighlight = {
    default: 'border-slate-200/80 dark:border-slate-800',
    income: 'border-emerald-200 dark:border-emerald-900/40',
    expense: 'border-red-200 dark:border-red-900/40',
    accent: 'border-blue-200 dark:border-blue-900/40',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 border ${borderHighlight[highlight]} rounded-lg p-5 shadow-card transition-all ${
        onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium tracking-wide uppercase mb-2">
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-slate-400 dark:text-slate-500">{icon}</span>}
          <span>{label}</span>
        </div>
        {badge && <div>{badge}</div>}
      </div>

      <div className="text-2xl font-semibold text-slate-900 dark:text-white tnum tracking-tight">
        {value}
      </div>

      {subtitle && (
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-normal">
          {subtitle}
        </div>
      )}
    </div>
  );
};
