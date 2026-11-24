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

function getIndianRupeesWords(paise: number): string {
  const rupees = Math.floor(Math.abs(paise) / 100);
  if (rupees === 0) return '';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numToWordsLessThanThousand = (n: number): string => {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  };

  let remaining = rupees;
  let parts: string[] = [];

  if (remaining >= 10000000) {
    const cr = Math.floor(remaining / 10000000);
    parts.push(numToWordsLessThanThousand(cr) + (cr === 1 ? ' Crore' : ' Crores'));
    remaining %= 10000000;
  }
  if (remaining >= 100000) {
    const lk = Math.floor(remaining / 100000);
    parts.push(numToWordsLessThanThousand(lk) + (lk === 1 ? ' Lakh' : ' Lakhs'));
    remaining %= 100000;
  }
  if (remaining >= 1000) {
    const th = Math.floor(remaining / 1000);
    parts.push(numToWordsLessThanThousand(th) + ' Thousand');
    remaining %= 1000;
  }
  if (remaining > 0) {
    parts.push(numToWordsLessThanThousand(remaining));
  }
  return parts.join(' ').trim() + ' Rupees';
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
        <label className="block caption-4 text-slate-700 dark:text-slate-300 mb-1.5">
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
          className={`w-full bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-[#313131] rounded-md pr-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 ease-out-expo tnum font-mono ${sizeClasses[size]}`}
        />
      </div>
      {valuePaise > 0 && (
        <p className="mt-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
          ≈ {getIndianRupeesWords(valuePaise)}
        </p>
      )}
    </div>
  );
};
