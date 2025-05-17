/**
 * This script helps detect when something is trying to load Google Maps
 * It should be imported in your _app.tsx or providers.tsx file
 */
export function setupGoogleMapsDebugger() {
  if (typeof window === 'undefined') return;
  
  console.log('🔍 Setting up Google Maps API debugger');
  
  // Define a getter for window.google to detect when something tries to access it
  let googleValue: any = undefined;
  Object.defineProperty(window, 'google', {
    get: function() {
      console.trace('🚨 Something is trying to access window.google:');
      return googleValue;
    },
    set: function(val) {
      console.log('🚨 Something is trying to set window.google:', val);
      console.trace();
      googleValue = val;
    },
    configurable: true
  });
  
  // Monitor script additions to the document
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName: string) {
    const element = originalCreateElement.call(document, tagName);
    
    if (tagName.toLowerCase() === 'script') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name: string, value: string) {
        if (name === 'src' && 
           (value.includes('maps.googleapis.com') || 
            value.includes('google.com/maps'))) {
          console.trace('🚨 Script trying to load Google Maps API:');
          console.log('Script URL:', value);
        }
        return originalSetAttribute.call(this, name, value);
      };
    }
    
    return element;
  };
  
  console.log('🔍 Google Maps API debugger setup complete');
}
