/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        apple: {
          bg: '#F5F5F7',
          surface: '#FFFFFF',
          text: '#1D1D1F',
          secondary: '#6E6E73',
          border: 'rgba(0, 0, 0, 0.08)',
          accent: '#0071E3',
          'accent-hover': '#0077ED',
          success: '#34C759',
          warning: '#FF9F0A',
          danger: '#FF3B30',
          darkBg: '#000000',
          darkSurface: '#1C1C1E',
          darkCard: '#2C2C2E',
          darkText: '#F5F5F7',
          darkSecondary: '#86868B',
          darkBorder: 'rgba(255, 255, 255, 0.12)',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        'apple': '16px',
        'apple-lg': '20px',
        'apple-xl': '24px',
      },
      boxShadow: {
        'apple-subtle': '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        'apple-card': '0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)',
        'apple-modal': '0 20px 48px rgba(0,0,0,0.14), 0 10px 20px rgba(0,0,0,0.06)',
      }
    },
  },
  plugins: [],
}

