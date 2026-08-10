import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border:     'hsl(var(--border))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        positive: 'hsl(var(--positive))',
        warning:  'hsl(var(--warning))',
        critical: 'hsl(var(--critical))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        /* Slab de cartel/etiqueta vintage — solo para palabras, nunca para dígitos */
        serif: ['"Alfa Slab One"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Karla', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        /* Números tipo libro contable/máquina de escribir, no código */
        mono: ['"Courier Prime"', '"Courier New"', 'monospace'],
      },
      boxShadow: {
        stamp: '5px 5px 0 0 hsl(var(--foreground) / 0.1)',
        'stamp-sm': '3px 3px 0 0 hsl(var(--foreground) / 0.1)',
        'stamp-primary': '5px 5px 0 0 hsl(var(--primary) / 0.3)',
      },
    },
  },
  plugins: [],
}

export default config
