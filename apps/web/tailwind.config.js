/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ctp: {
          base: '#1e1e2e',
          mantle: '#181825',
          crust: '#11111b',
          surface0: '#313244',
          surface1: '#45475a',
          surface2: '#585b70',
          text: '#cdd6f4',
          subtext1: '#bac2de',
          subtext2: '#a6adc8',
          overlay0: '#6c7086',
          overlay1: '#585b70',
          blue: '#89b4fa',
          green: '#a6e3a1',
          orange: '#fab387',
          red: '#f38ba8',
          yellow: '#f9e2af',
          pink: '#f5c2e7',
          mauve: '#cba6f7',
          peach: '#fab387',
          teal: '#94e2d5',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};