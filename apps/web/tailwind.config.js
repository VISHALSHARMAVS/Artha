/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0F172A',
          hover: '#1E293B',
          secondary: '#2563EB',
          accent: '#3B82F6',
        },
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
        },
        surface: {
          app: 'var(--bg-app)',
          card: 'var(--bg-surface)',
          elevated: 'var(--bg-surface-elevated)',
          subtle: 'var(--bg-surface-subtle)',
          primary: 'var(--bg-surface)',
          secondary: 'var(--bg-surface-subtle)',
        },
        // Approved dark mode colors from landing-page-design skill:
        // #000000 · #181818 · #1F1F1F · #272727 · #313131 · #131209
        dark: {
          pure: '#000000',
          bg: '#181818',
          surface: '#1F1F1F',
          elevated: '#272727',
          border: '#313131',
          gold: '#131209',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-tertiary)',
        },
        border: {
          default: 'var(--border-subtle)',
          subtle: 'var(--border-subtle)',
          medium: 'var(--border-medium)',
          focus: 'var(--border-focus)',
        },
        fin: {
          income: 'var(--color-income)',
          'income-subtle': 'var(--color-income-subtle)',
          expense: 'var(--color-expense)',
          'expense-subtle': 'var(--color-expense-subtle)',
          transfer: 'var(--color-transfer)',
          'transfer-subtle': 'var(--color-transfer-subtle)',
        },
      },
      spacing: {
        'spacing-0': '0px',
        'spacing-25': '2px',
        'spacing-50': '4px',
        'spacing-75': '8px',
        'spacing-100': '12px',
        'spacing-200': '16px',
        'spacing-300': '24px',
        'spacing-400': '32px',
        'spacing-500': '40px',
        'spacing-600': '48px',
        'spacing-700': '64px',
        'spacing-800': '80px',
        'spacing-900': '96px',
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        mono: ['"Geist Mono"', 'monospace'],
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
