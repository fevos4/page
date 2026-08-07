import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Soria', '"Cormorant Garamond"', '"Playfair Display"', 'Cinzel', 'serif'],
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
