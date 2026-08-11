/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        knight: {
          light: '#f8f9fa',
          dark: '#0D1117',
          accent: '#d4af37', // Gold
          silver: '#C0C0C0',
          text: '#2d3748',
          textDark: '#e2e8f0'
        }
      }
    },
  },
  plugins: [],
}
