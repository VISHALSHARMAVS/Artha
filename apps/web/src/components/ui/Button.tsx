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
  const baseClasses = 'inline-flex items-center justify-center rounded-md transition-all duration-300 ease-out-expo active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none';

  // Landing Page Design Tokens: B1 Typography (Button-lg/md/sm) and B2 Spacing (Main buttons: 8px vertical, 12px horizontal)
  const sizeClasses = {
    sm: 'py-1.5 px-2.5 button-sm gap-1.5',
    md: 'py-2 px-3 button-md gap-2',
    lg: 'py-2.5 px-4 button-lg gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-[#181818] dark:hover:bg-white focus-visible:ring-slate-900 shadow-subtle',
    secondary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600 shadow-subtle',
    subtle: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#272727] dark:text-[#F9FAFB] dark:hover:bg-[#313131] focus-visible:ring-slate-400',
    outline: 'border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 dark:border-[#313131] dark:text-[#F9FAFB] dark:hover:bg-[#272727] focus-visible:ring-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 shadow-subtle',
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
