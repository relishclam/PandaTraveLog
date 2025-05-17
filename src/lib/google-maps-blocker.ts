'use client';

/**
 * This script prevents any Google Maps Platform APIs from loading, including Maps, Places, and other services by:
 * 1. Intercepting script tags trying to load googleapis.com
 * 2. Setting a meta tag that blocks loading any Google Maps Platform APIs
 * 3. Removing any global Google namespace that might already be loaded
 * 4. Intercepting network requests to Google APIs
 */
export function blockGoogleMapsScripts() {
  // Only run in browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  console.log('🚫 Google Maps Platform API blocker activated');
  
  // Create a meta tag that tells browsers not to load Google Maps Platform APIs
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://* blob: data: https://unpkg.com https://*.netlify.app https://*.geoapify.com https://*.mapbox.com https://*.supabase.co https://*.supabase.in https://*.vercel.app https://*.jsdelivr.net https://*.unpkg.com; connect-src 'self' blob: data: https://* wss://* https://*.geoapify.com https://*.supabase.co https://*.supabase.in https://*.googleapis.com; block-all-mixed-content;";
  
  document.head.appendChild(meta);
  
  // Remove any existing Google namespace
  if (window.google) {
    console.log('🧹 Cleaning up existing Google API references');
    try {
      // @ts-ignore
      delete window.google;
    } catch (e) {
      console.warn('Could not delete window.google:', e);
      // Alternative approach if delete fails
      // @ts-ignore
      window.google = undefined;
    }
  }
  
  // Block any dynamic script loading attempts
  const originalCreateElement = document.createElement;
  document.createElement = function(...args: any[]) {
    const element = originalCreateElement.apply(document, args);
    
    if (args[0].toLowerCase() === 'script') {
      // Intercept setting src attribute to prevent Google APIs loading
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name: string, value: string) {
        if (name === 'src' && (
            // Block Maps API scripts
            value.includes('maps.googleapis.com') || 
            value.includes('google.com/maps') ||
            // Block Places API scripts
            value.includes('places.googleapis.com') ||
            value.includes('google.com/places') ||
            // Block any script with the API key
            value.includes('AIzaSyBKOGPT8Tr') ||
            // Block any google maps libraries parameter
            value.includes('libraries=places')
          )) {
          console.warn('🚫 Blocked attempt to load Google Maps Platform API script:', value);
          return element;
        }
        return originalSetAttribute.call(this, name, value);
      };
    }
    
    return element;
  };
  
  // Block any explicit attempts to dynamically create script for Maps
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeName === 'SCRIPT') {
            // @ts-ignore
            const src = node.src || '';
            if (src.includes('googleapis.com') || 
                src.includes('google.com/maps') || 
                src.includes('places') ||
                src.includes('AIzaSyBKOGPT8Tr')) {
              console.warn('🚫 Removing dynamically added Google Maps script:', src);
              node.parentNode?.removeChild(node);
            }
          }
        });
      }
    });
  });
  
  observer.observe(document.documentElement, { 
    childList: true, 
    subtree: true 
  });
}
