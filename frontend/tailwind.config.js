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
        apple: {
          bg: '#0a0a0c',
          darkBg: '#0a0a0c',
          surface: '#121315',
          darkSurface: '#121315',
          card: '#121315',
          darkCard: '#121315',
          border: '#222325',
          darkBorder: '#222325',
          accent: '#c8303a',
          accentHover: '#e03642',
          brand: '#c8303a',
          brandHover: '#e03642',
          button: '#16161a',
          buttonHover: '#1f2024',
          secondary: '#d6d6d5',
          textPrimary: '#faf8f9',
          textSecondary: '#e5e5e4',
          textMuted: '#d6d6d5',
          success: '#34C759',
          warning: '#FF9500',
          danger: '#FF3B30',
          info: '#c8303a',
        }
      },
      fontFamily: {
        sans: [
          '"Host Grotesk"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Inter"',
          'system-ui',
          'sans-serif'
        ],
      },
      boxShadow: {
        'apple-sm': '0 2px 8px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.2)',
        'apple-md': '0 8px 24px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.4)',
        'apple-lg': '0 16px 40px rgba(0, 0, 0, 0.8), 0 4px 12px rgba(0, 0, 0, 0.4)',
        'apple-modal': '0 24px 60px rgba(0, 0, 0, 0.9), 0 8px 20px rgba(0, 0, 0, 0.6)',
        'brand-glow': '0 0 25px -4px rgba(200, 48, 58, 0.35)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out forwards',
        scaleUp: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        slideDown: 'slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }
    },
  },
  plugins: [],
}
