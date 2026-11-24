import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'subtle' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-xl transition-all duration-300 ease-out-expo active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none';

  // Landing Page Design Tokens: B1 Typography (Button-lg/md/sm) and B2 Spacing (Main buttons: 8px vertical, 12px horizontal)
  const sizeClasses = {
    sm: 'py-1.5 px-3 button-sm gap-1.5',
    md: 'py-2 px-3.5 button-md gap-2',
    lg: 'py-2.5 px-4.5 button-lg gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-gradient-to-r dark:from-blue-600 dark:to-indigo-600 dark:hover:from-blue-500 dark:hover:to-indigo-500 dark:text-white focus-visible:ring-blue-500 shadow-md shadow-blue-500/20',
    secondary: 'bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-600 shadow-md shadow-blue-500/20',
    subtle: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.1] dark:border dark:border-white/[0.08] focus-visible:ring-slate-400',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.08] dark:hover:border-white/20 focus-visible:ring-slate-400 shadow-sm',
    danger: 'bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-600 shadow-md shadow-rose-500/20',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
