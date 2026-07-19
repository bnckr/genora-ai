import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2B0B5A',
        },
        cyan: {
          400: '#22d3ee',
          500: '#19E6FF',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow':  'spin 8s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #19E6FF, 0 0 10px #19E6FF' },
          '100%': { boxShadow: '0 0 20px #19E6FF, 0 0 30px #5E1BFF' },
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #2B0B5A 0%, #5E1BFF 50%, #19E6FF 100%)',
        'gradient-hero': 'radial-gradient(ellipse at top, #4C1D95 0%, #0D0622 70%)',
      },
    },
  },
  plugins: [],
}

export default config
