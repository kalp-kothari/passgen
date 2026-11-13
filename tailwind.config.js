/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'kb-red':       '#E61E25',
        'kb-dark-red':  '#B01018',
        'kb-black':     '#111111',
        'kb-yellow':    '#FFD700',
        'kb-grey':      '#F5F5F5',
        'kb-dark-grey': '#1A1A1A',
        'kb-mid-grey':  '#333333',
      },
      fontFamily: {
        bangers: ['Bangers', 'cursive'],
        exo:     ['"Exo 2"', 'sans-serif'],
      },
      boxShadow: {
        comic:        '5px 5px 0px #111111',
        'comic-lg':   '8px 8px 0px #111111',
        'comic-red':  '5px 5px 0px #E61E25',
        'comic-gold': '5px 5px 0px #FFD700',
        'comic-white':'5px 5px 0px rgba(255,255,255,0.4)',
      },
      backgroundSize: {
        halftone: '24px 24px',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        wheelSpin: {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        scanLine: {
          '0%':   { top: '0%' },
          '100%': { top: '100%' },
        },
        glitch: {
          '0%, 100%': { clipPath: 'inset(0 0 95% 0)' },
          '20%':      { clipPath: 'inset(30% 0 50% 0)', transform: 'translate(-4px)' },
          '40%':      { clipPath: 'inset(60% 0 20% 0)', transform: 'translate(4px)' },
          '60%':      { clipPath: 'inset(10% 0 80% 0)', transform: 'translate(-2px)' },
          '80%':      { clipPath: 'inset(50% 0 40% 0)', transform: 'translate(2px)' },
        },
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'float':      'float 3s ease-in-out infinite',
        'wheel-spin': 'wheelSpin 0.6s linear infinite',
        'scan-line':  'scanLine 1.5s ease-in-out infinite',
        'glitch':     'glitch 0.3s steps(2) infinite',
        'ticker':     'ticker 25s linear infinite',
      },
    },
  },
  plugins: [],
}
