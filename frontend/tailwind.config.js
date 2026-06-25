/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Flat colors structure for absolute compiler/PostCSS compatibility
        'mafia-bg': '#0F141B',
        'mafia-bgSecondary': '#1B222D',
        'mafia-surface': '#1B222D',
        'mafia-card': '#222A36',
        'mafia-border': '#2D3644',
        'mafia-accent': '#7A1F1F',
        'mafia-accentSecondary': '#611818',
        'mafia-accentHover': '#8F2A2A',
        'mafia-text': '#F5F5F5',
        'mafia-textSecondary': '#A8B0BC',
        'mafia-success': '#3BA55D',
        'mafia-warning': '#E0A800',
        'mafia-danger': '#D63C3C',
        'mafia-red': '#7A1F1F',

        // Nested structure for component reference flexibility
        mafia: {
          bg: '#0F141B',
          bgSecondary: '#1B222D',
          surface: '#1B222D',
          card: '#222A36',
          border: '#2D3644',
          accent: '#7A1F1F',
          accentSecondary: '#611818',
          accentHover: '#8F2A2A',
          text: '#F5F5F5',
          textSecondary: '#A8B0BC',
          success: '#3BA55D',
          warning: '#E0A800',
          danger: '#D63C3C',
          red: '#7A1F1F',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
        display: ['Outfit', 'Poppins', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.65)',
        glow: '0 0 20px rgba(122, 31, 31, 0.5)',
        glowGreen: '0 0 20px rgba(59, 165, 93, 0.4)',
        glowBlue: '0 0 20px rgba(59, 130, 246, 0.4)',
      }
    },
  },
  plugins: [],
}
