'use client';

/**
 * Utility functions for handling image paths
 */

// Map of image paths to ensure consistent usage across the application
export const IMAGE_PATHS = {
  // Panda logo images
  LOGO: {
    ICON: '/images/logo/logo-icon.png',
    FULL: '/images/logo/logo-full.png',
  },
  // Panda emotions
  EMOTIONS: {
    HAPPY: '/images/po/emotions/happy.png',
    THINKING: '/images/po/emotions/thinking.png',
    EXCITED: '/images/po/emotions/excited.png',
    CONFUSED: '/images/po/emotions/confused.png',
    SAD: '/images/po/emotions/sad.png',
    FALLBACK: '/images/po/emotions/fallback-logo.png',
  },
};

/**
 * Get the correct path for a panda emotion
 * @param emotion The emotion to get the image for
 * @returns The path to the image
 */
export function getEmotionImagePath(emotion: 'happy' | 'thinking' | 'excited' | 'confused' | 'sad'): string {
  switch(emotion) {
    case 'thinking':
      return IMAGE_PATHS.EMOTIONS.THINKING;
    case 'excited':
      return IMAGE_PATHS.EMOTIONS.EXCITED;
    case 'confused':
      return IMAGE_PATHS.EMOTIONS.CONFUSED;
    case 'sad':
      return IMAGE_PATHS.EMOTIONS.SAD;
    case 'happy':
    default:
      return IMAGE_PATHS.EMOTIONS.HAPPY;
  }
}

/**
 * Get the fallback logo image path
 * @returns The path to the fallback logo image
 */
export function getFallbackLogoPath(): string {
  return IMAGE_PATHS.EMOTIONS.FALLBACK;
}

/**
 * Get the logo icon image path
 * @returns The path to the logo icon image
 */
export function getLogoIconPath(): string {
  return IMAGE_PATHS.LOGO.ICON;
}

/**
 * Preload images to prevent 404 errors
 * Call this function early in the application lifecycle
 */
export function preloadPandaImages(): void {
  if (typeof window === 'undefined') return;
  
  const imagesToPreload = [
    ...Object.values(IMAGE_PATHS.LOGO),
    ...Object.values(IMAGE_PATHS.EMOTIONS),
  ];
  
  imagesToPreload.forEach(src => {
    const img = document.createElement('img');
    img.src = src;
  });
}
