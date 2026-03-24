// Tailwind CSS config for premium admin dashboard
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        charcoal: '#18191A',
        slate: '#23272F',
        gold: '#B8860B',
        glass: 'rgba(36, 39, 46, 0.7)'
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif']
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        gold: '0 2px 8px 0 #B8860B44'
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        xl: '1.25rem',
      },
      transitionTimingFunction: {
        'custom': 'cubic-bezier(0.77, 0, 0.175, 1)'
      }
    },
  },
  plugins: [],
};
