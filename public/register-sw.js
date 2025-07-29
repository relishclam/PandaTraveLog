// Register service worker
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // First, try to unregister any existing service worker
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('Service Worker unregistered');
      }

      // Clear any existing caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('Caches cleared');

      // Register new service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      if (registration.installing) {
        console.log('Service worker installing');
      } else if (registration.waiting) {
        console.log('Service worker installed');
      } else if (registration.active) {
        console.log('Service worker active');
      }

      // Force reload once the new service worker takes control
      registration.addEventListener('activate', () => {
        console.log('New service worker activated');
      });

    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  } else {
    console.log('Service workers are not supported');
  }
}

// Call registration function
registerServiceWorker();
