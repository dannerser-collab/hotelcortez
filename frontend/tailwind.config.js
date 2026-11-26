/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hotel: {
          dark: '#004133',
          sidebar: '#005D4F',
          primary: '#005D4F',
          primaryHover: '#004133',
          accent: '#B9A271',
          accentLight: '#EAE1CC',
          cream: '#F6F4EE',
          creamDark: '#EDE8DC',
          card: '#FFFFFF',
          border: '#E2DCCE',
          text: '#004133',
          textMuted: '#546A64',
          red: '#DC2626',
          redDark: '#991B1B',
          amber: '#D97706',
          green: '#10B981'
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}

