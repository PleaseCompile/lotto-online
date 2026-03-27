import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{vue,ts,js}',
    './components/**/*.{vue,ts,js}',
    './layouts/**/*.{vue,ts,js}',
    './pages/**/*.{vue,ts,js}',
    './composables/**/*.{vue,ts,js}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#D4A017',
          dark: '#B8860B',
          light: '#F0C040',
          50: '#FFF9E6',
          100: '#FFF0BF',
          200: '#FFE799',
          300: '#FFDB66',
          400: '#F0C040',
          500: '#D4A017',
          600: '#B8860B',
          700: '#936B09',
          800: '#6E5007',
          900: '#493504',
        },
        secondary: {
          DEFAULT: '#1E3A5F',
          light: '#2E5A8E',
          dark: '#0F1F33',
          50: '#EBF0F7',
          100: '#C4D4E8',
          200: '#9DB8D9',
          300: '#769CCA',
          400: '#4F80BB',
          500: '#2E5A8E',
          600: '#1E3A5F',
          700: '#162C48',
          800: '#0F1F33',
          900: '#07101A',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F7F8FA',
          dark: '#1A1A2E',
          'dark-alt': '#16213E',
        },
        success: {
          DEFAULT: '#16A34A',
          light: '#22C55E',
          dark: '#15803D',
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#EF4444',
          dark: '#B91C1C',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FBBF24',
          dark: '#D97706',
        },
        border: {
          DEFAULT: '#E5E7EB',
          dark: '#334155',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Thai"', ...defaultTheme.fontFamily.sans],
        mono: ['"IBM Plex Mono"', ...defaultTheme.fontFamily.mono],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(212, 160, 23, 0.3)',
        'glow-lg': '0 0 40px rgba(212, 160, 23, 0.4)',
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '16px',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212, 160, 23, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(212, 160, 23, 0.5)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
