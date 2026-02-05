/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Pixelify Sans"', 'cursive'],
      },
      colors: {
        ink: '#000000',
        paper: '#ffffff',
        muted: '#888888',
        subtle: '#f5f5f5',
      },
      borderWidth: {
        3: '3px',
      },
    },
  },
  daisyui: {
    themes: [
      {
        wesource: {
          primary: '#000000',
          secondary: '#ffffff',
          accent: '#000000',
          neutral: '#000000',
          'base-100': '#ffffff',
          info: '#e0e7ff',
          success: '#d1fae5',
          warning: '#fef3c7',
          error: '#fee2e2',
        },
      },
    ],
    logs: false,
  },
  plugins: [require('daisyui')],
}
