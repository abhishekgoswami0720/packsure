/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    // Brand palette is intentionally tight. These map 1:1 to src/core/theme/tokens.ts.
    colors: {
      transparent: 'transparent',
      black: '#000000',
      white: '#FFFFFF',
      background: '#FAFAF8',
      surface: '#FFFFFF',
      ink: {
        DEFAULT: '#111111',
        secondary: '#666666',
        tertiary: '#9A9A95',
      },
      hairline: '#ECEBE6',
      brand: {
        DEFAULT: '#8DB355',
        strong: '#5C8A2E',
        soft: '#EEF5E2',
      },
      success: {
        DEFAULT: '#4D9B68',
        soft: '#EAF3ED',
      },
      warning: {
        DEFAULT: '#D8A641',
        soft: '#F8F0DE',
      },
      danger: {
        DEFAULT: '#C86A6A',
        soft: '#F6E7E7',
      },
    },
    fontFamily: {
      regular: ['Inter_400Regular'],
      medium: ['Inter_500Medium'],
      semibold: ['Inter_600SemiBold'],
      bold: ['Inter_700Bold'],
    },
    fontSize: {
      caption: ['13px', { lineHeight: '18px' }],
      secondary: ['15px', { lineHeight: '22px' }],
      body: ['17px', { lineHeight: '25px' }],
      section: ['20px', { lineHeight: '27px' }],
      heading: ['24px', { lineHeight: '30px' }],
      hero: ['32px', { lineHeight: '38px' }],
    },
    extend: {
      spacing: {
        1: '4px',
        2: '8px',
        4: '16px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
      },
      borderRadius: {
        card: '24px',
        button: '16px',
        pill: '999px',
      },
    },
  },
  plugins: [],
};
