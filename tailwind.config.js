// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'panda-black': '#2D2D2D',
        'panda-white': '#FFFFFF',
        'backpack-orange': '#FF9D2F',
        'leaf-green': '#4CAF50',
        'bamboo-light': '#F5F5DC',
        'highlight-blue': '#87CEEB',
        primary: '#FF9D2F',
        secondary: '#4CAF50',
        destructive: '#FF0000',
        accent: '#87CEEB',
      },
      fontFamily: {
        'panda': ['Nunito', 'sans-serif'],
        'nunito': ['Nunito', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
      },
    },
  },
  plugins: [],
}