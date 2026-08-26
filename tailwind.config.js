/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    colors: {
      bg: '#F6F3EC',
      panel: '#FFFFFF',
      ink: '#24312B',
      'ink-soft': '#5B6B62',
      sage: '#6E8F72',
      'sage-deep': '#4C6B51',
      'sage-pale': '#E7EEE4',
      clay: '#B9714B',
      'clay-pale': '#F3E3D8',
      line: '#E3DDCE',
      blue: '#4A6FA5',
      red: '#B25B4C',
      'red-pale': '#F1E4E1',
      dark: '#21302A',
      // Utility colors
      white: '#FFFFFF',
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000000',
      gray: {
        50: '#f9fafb',
        200: '#eeeff2',
      }
    },
    fontFamily: {
      serif: ['Fraunces', 'serif'],
      sans: ['IBM Plex Sans', 'sans-serif'],
      mono: ['IBM Plex Mono', 'monospace'],
    },
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUpFade: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out both',
        'fade-in-up': 'fadeInUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up-fade': 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
