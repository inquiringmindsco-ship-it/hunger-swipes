/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Hunger Swipes premium palette
        hs: {
          black: '#0A0A0A',
          ink: '#0D0D0D',
          charcoal: '#141414',
          graphite: '#1A1A1A',
          soft: '#252525',
          muted: '#6B6B6B',
          gray: '#8A8A8A',
          silver: '#BDBDBD',
          cream: '#FAF9F6',
          white: '#FFFFFF',
          gold: '#D4AF37',
          'gold-light': '#E8C547',
          'gold-dark': '#B8962E',
          red: '#E53935',
          'red-dark': '#C62828',
          success: '#22C55E',
          error: '#E53935',
        },
        // Legacy aliases (kept for compatibility during transition)
        primary: '#FF5722',
        secondary: '#1A1A2E',
        accent: '#FFD700',
        success: '#10B981',
        error: '#EF4444',
      },
      fontFamily: {
        // System-first font stack to avoid CSP/Google Fonts issues
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        display: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"Segoe UI"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        // Kept for compatibility but mapped to safe system stack
        poppins: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', 'sans-serif'],
        inter: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      spacing: {
        'safe': 'env(safe-area-inset-bottom)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 10px 40px rgba(0, 0, 0, 0.35)',
        'card-lg': '0 20px 60px rgba(0, 0, 0, 0.45)',
        'gold': '0 0 40px rgba(212, 175, 55, 0.25)',
        'gold-sm': '0 0 20px rgba(212, 175, 55, 0.18)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'premium': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        '350': '350ms',
        '450': '450ms',
      },
      animation: {
        'bounce': 'bounce 0.5s ease',
        'slide-up': 'slideUp 0.4s ease',
        'fade-in': 'fadeIn 0.3s ease',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
