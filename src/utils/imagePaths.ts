'use client';

/**
 * Utility functions for handling image paths
 */

// Define emotion types locally to avoid context dependency
type Emotion = 'happy' | 'thinking' | 'excited' | 'confused' | 'sad' | 'love' | 'surprised' | 'curious';

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
    LOVE: '/images/po/emotions/love.png',
    SURPRISED: '/images/po/emotions/surprised.png',
    CURIOUS: '/images/po/emotions/curious.png',
    FALLBACK: '/images/po/emotions/fallback-logo.png',
  },
};

/**
 * Get the correct path for a panda emotion
 * @param emotion The emotion to get the image for
 * @returns The path to the image
 */
export function getEmotionImagePath(emotion?: Emotion): string {
  const currentEmotion = emotion || 'happy';
  switch(currentEmotion) {
    case 'thinking':
      return IMAGE_PATHS.EMOTIONS.THINKING;
    case 'excited':
      return IMAGE_PATHS.EMOTIONS.EXCITED;
    case 'confused':
      return IMAGE_PATHS.EMOTIONS.CONFUSED;
    case 'sad':
      return IMAGE_PATHS.EMOTIONS.SAD;
    case 'love':
      return IMAGE_PATHS.EMOTIONS.LOVE;
    case 'surprised':
      return IMAGE_PATHS.EMOTIONS.SURPRISED;
    case 'curious':
      return IMAGE_PATHS.EMOTIONS.CURIOUS;
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
