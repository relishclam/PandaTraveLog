import type { Config } from 'tailwindcss'

const config: Config = {
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
      },
      fontFamily: {
        'panda': ['Nunito', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
      },
    },
  },
  plugins: [],
}
export default config
