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
        background: '#0A0A0A',
        foreground: '#FAFAFA',
        muted: '#1A1A1A',
        mutedForeground: '#737373',
        accent: '#FF3D00',
        accentForeground: '#0A0A0A',
        border: '#262626',
        input: '#1A1A1A',
        card: '#0F0F0F',
        cardForeground: '#FAFAFA',
        ring: '#FF3D00',
        apple: {
          bg: '#0A0A0A',
          darkBg: '#0A0A0A',
          surface: '#1A1A1A',
          darkSurface: '#1A1A1A',
          card: '#0F0F0F',
          darkCard: '#0F0F0F',
          border: '#262626',
          darkBorder: '#262626',
          accent: '#FF3D00',
          accentHover: '#E03600',
          brand: '#FF3D00',
          brandHover: '#E03600',
          button: '#1A1A1A',
          buttonHover: '#262626',
          secondary: '#737373',
          textPrimary: '#FAFAFA',
          textSecondary: '#737373',
          textMuted: '#737373',
          success: '#34C759',
          warning: '#FF9500',
          danger: '#FF3B30',
          info: '#FF3D00',
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
        serif: [
          '"Playfair Display"',
          'Georgia',
          'serif'
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          'monospace'
        ]
      },
      letterSpacing: {
        tighter: '-0.06em',
        tight: '-0.04em',
        normal: '-0.01em',
        wide: '0.05em',
        wider: '0.1em',
        widest: '0.2em',
      },
      lineHeight: {
        none: '1',
        tight: '1.1',
        snug: '1.25',
        normal: '1.6',
        relaxed: '1.75',
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '0px',
      },
      boxShadow: {
        none: 'none',
        'apple-sm': 'none',
        'apple-md': 'none',
        'apple-lg': 'none',
        'apple-modal': 'none',
        'brand-glow': 'none',
        'accent-line': '0 2px 0 #FF3D00',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.15s cubic-bezier(0.25, 0, 0, 1) forwards',
      }
    },
  },
  plugins: [],
}
