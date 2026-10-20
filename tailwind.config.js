/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          DEFAULT: 'var(--color-primary)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          tint: 'var(--color-accent-tint)',
        },
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        'surface-subtle': 'var(--color-surface-subtle)',
        border: 'var(--color-border)',
        'border-subtle': 'var(--color-border-subtle)',
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          subtle: 'var(--color-text-subtle)',
        },
        semantic: {
          success: 'var(--color-success)',
          'success-tint': 'var(--color-success-tint)',
          warning: 'var(--color-warning)',
          'warning-tint': 'var(--color-warning-tint)',
          danger: 'var(--color-danger)',
          'danger-tint': 'var(--color-danger-tint)',
          info: 'var(--color-info)',
          'info-tint': 'var(--color-info-tint)',
          slate: 'var(--color-slate)',
          'slate-tint': 'var(--color-slate-tint)',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', '16px'],
        sm: ['14px', '20px'],
        base: ['16px', '24px'],
        lg: ['18px', '28px'],
        xl: ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['30px', '38px'],
      },
      borderRadius: {
        control: '8px',
        card: '12px',
        pill: '9999px',
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        sidebar: '248px',
        'sidebar-collapsed': '72px',
        topbar: '64px',
      },
      maxWidth: {
        content: '1280px',
      },
      transitionDuration: {
        DEFAULT: '150ms',
        fast: '150ms',
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -2px rgba(15, 23, 42, 0.04)',
        modal: '0 10px 30px -4px rgba(15, 23, 42, 0.16), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
