import React, { useState, useEffect } from 'react';

export interface AmountInputProps {
  valuePaise: number;
  onChangePaise: (paise: number) => void;
  label?: string;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  autoFocus?: boolean;
  required?: boolean;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  valuePaise,
  onChangePaise,
  label,
  placeholder = '0.00',
  size = 'md',
  autoFocus = false,
  required = false,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(
    valuePaise > 0 ? (valuePaise / 100).toString() : ''
  );

  useEffect(() => {
    if (valuePaise === 0 && displayValue === '') return;
    const currentPaiseFromDisplay = Math.round((parseFloat(displayValue) || 0) * 100);
    if (currentPaiseFromDisplay !== valuePaise) {
      setDisplayValue(valuePaise > 0 ? (valuePaise / 100).toString() : '');
    }
  }, [valuePaise]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    // Allow single decimal point
    const parts = val.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return; // At most 2 decimal places

    setDisplayValue(val);
    const parsedFloat = parseFloat(val);
    if (!isNaN(parsedFloat)) {
      onChangePaise(Math.round(parsedFloat * 100));
    } else {
      onChangePaise(0);
    }
  };

  const sizeClasses = {
    sm: 'h-8 text-sm pl-7',
    md: 'h-10 text-base pl-8',
    lg: 'h-14 text-2xl font-semibold pl-10',
  };

  const symbolSizes = {
    sm: 'text-xs left-2.5',
    md: 'text-sm left-3',
    lg: 'text-xl left-3.5',
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        <span
          className={`absolute text-slate-400 dark:text-slate-500 font-medium select-none pointer-events-none ${symbolSizes[size]}`}
        >
          ₹
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md pr-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors tnum ${sizeClasses[size]}`}
        />
      </div>
    </div>
  );
};
