/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#F8F9FA',
        foreground: '#111827',
        muted: '#F3F4F6',
        mutedForeground: '#6B7280',
        accent: '#0071E3',
        accentForeground: '#FFFFFF',
        border: '#E5E7EB',
        input: '#FFFFFF',
        card: '#FFFFFF',
        cardForeground: '#111827',
        ring: '#0071E3',
        apple: {
          bg: '#F8F9FA',
          darkBg: '#F8F9FA',
          surface: '#FFFFFF',
          darkSurface: '#FFFFFF',
          card: '#FFFFFF',
          darkCard: '#FFFFFF',
          border: '#E5E7EB',
          darkBorder: '#E5E7EB',
          accent: '#0071E3',
          accentHover: '#005BB5',
          brand: '#0071E3',
          brandHover: '#005BB5',
          button: '#0071E3',
          buttonHover: '#005BB5',
          secondary: '#6B7280',
          textPrimary: '#111827',
          textSecondary: '#4B5563',
          textMuted: '#9CA3AF',
          success: '#34C759',
          warning: '#FF9500',
          danger: '#FF3B30',
          info: '#0071E3',
        }
      },
      fontFamily: {
        sans: [
          '"Inter Tight"',
          '"Inter"',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif'
        ],
        mono: [
          '"JetBrains Mono"',
          'monospace'
        ]
      },
      boxShadow: {
        'apple-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'apple-md': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'apple-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
        'apple-modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.15s ease-out forwards',
      }
    },
  },
  plugins: [],
}
