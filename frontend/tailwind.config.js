/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0c12',
        card: '#12151e',
        'card-border': '#1e2233',
        'card-hover': '#161a27',
        accent: '#4ade80',
        'accent-dim': '#22c55e',
        'accent-muted': '#166534',
        muted: '#64748b',
        subtle: '#1e2233',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
