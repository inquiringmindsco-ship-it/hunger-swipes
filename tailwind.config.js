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
        primary: '#FF5722',
        secondary: '#1A1A2E',
        accent: '#FFD700',
        success: '#10B981',
        error: '#EF4444',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'bounce': 'bounce 0.5s ease',
        'slide-up': 'slideUp 0.4s ease',
        'fade-in': 'fadeIn 0.3s ease',
      },
    },
  },
  plugins: [],
}
