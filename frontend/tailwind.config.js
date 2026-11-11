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
          dark: '#081C18',
          sidebar: '#0B2521',
          primary: '#0E332E',
          primaryHover: '#072420',
          accent: '#C2A661',
          accentLight: '#E8DCC2',
          cream: '#F8F7F4',
          creamDark: '#EFECE6',
          card: '#FFFFFF',
          border: '#E5E2D9',
          text: '#1C2826',
          textMuted: '#687774',
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

