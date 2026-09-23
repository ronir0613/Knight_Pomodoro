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
        knight: {
          light: '#f8f9fa',
          dark: '#0D1117',
          accent: '#d4af37',
          silver: '#C0C0C0',
          text: '#2d3748',
          textDark: '#e2e8f0'
        }
      },
      animation: {
        'in': 'in 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        in: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
