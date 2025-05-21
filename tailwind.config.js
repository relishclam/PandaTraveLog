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
      // Color Palette
      colors: {
        // Brand Colors
        'panda': {
          black: '#2D2D2D',
          white: '#FFFFFF',
          light: '#F8F9FA',
          gray: '#6B7280',
        },
        'bamboo': {
          light: '#F5F5DC',
          medium: '#E8E4C9',
          dark: '#D4C99E',
        },
        'backpack': {
          orange: '#FF9D2F',
          'orange-light': '#FFB35C',
          'orange-dark': '#E68A29',
        },
        'leaf': {
          green: '#4CAF50',
          'green-light': '#66BB6A',
          'green-dark': '#388E3C',
        },
        'accent': {
          blue: '#87CEEB',
          'blue-light': '#A5D8F3',
          'blue-dark': '#5F9EA0',
        },
        // Semantic Colors
        primary: {
          DEFAULT: '#FF9D2F',
          light: '#FFB35C',
          dark: '#E68A29',
        },
        secondary: {
          DEFAULT: '#4CAF50',
          light: '#66BB6A',
          dark: '#388E3C',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        destructive: '#EF4444',
      },
      
      // Typography
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        display: ['Nunito', 'sans-serif'],
        panda: ['Nunito', 'sans-serif'],
      },
      
      // Animations & Transitions
      animation: {
        // Basic Animations
        'bounce-slow': 'bounce 3s infinite',
        'pulse': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        
        // Custom Animations
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'shake-subtle': 'shake 2s ease-in-out infinite',
        'bounce-gentle': 'bounceGentle 2s infinite',
        'float': 'float 3s ease-in-out infinite',
        'wave': 'wave 2s ease-in-out infinite',
        'blink': 'blink 1s step-end infinite',
        
        // Entry Animations
        'slide-in-right': 'slideInFromRight 0.3s ease-out',
        'slide-in-left': 'slideInFromLeft 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'zoom-in': 'zoomIn 0.2s ease-out',
        'pop-in': 'popIn 0.2s ease-out',
      },
      
      keyframes: {
        // Basic Animations
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(1deg)' },
        },
        wave: {
          '0%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(5deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        
        // Entry Animations
        slideInFromRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInFromLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        zoomIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        popIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      
      transitionTimingFunction: {
        'bounce': 'cubic-bezier(0.8, 0, 1, 1)',
        'in-expo': 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
        'in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      
      // Custom Utilities
      boxShadow: {
        'panda': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'panda-md': '0 6px 12px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.06)',
        'panda-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'panda-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'panda-inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  
  // Variants
  variants: {
    extend: {
      opacity: ['disabled'],
      cursor: ['disabled'],
      backgroundColor: ['active', 'disabled'],
      textColor: ['active', 'disabled'],
      borderColor: ['active', 'disabled'],
      ringColor: ['focus-visible'],
      ringWidth: ['focus-visible'],
      ringOffsetWidth: ['focus-visible'],
      ringOffsetColor: ['focus-visible'],
    },
  },
  
  // Plugins
  plugins: [
    // Custom utilities function
    function({ addUtilities }) {
      const newUtilities = {
        '.animation-pause': {
          'animation-play-state': 'paused',
        },
        '.animation-play': {
          'animation-play-state': 'running',
        },
      };
      addUtilities(newUtilities, ['responsive', 'hover']);
    },
    // Safely try to load plugins
    function() { try { return require('@tailwindcss/forms'); } catch (e) { return {}; } },
    function() { try { return require('@tailwindcss/typography'); } catch (e) { return {}; } },
    function() { try { return require('@tailwindcss/aspect-ratio'); } catch (e) { return {}; } }
  ],
  
  // Core Plugins
  corePlugins: {
    // Disable default container to prevent conflicts with our custom container
    container: false,
  },
}