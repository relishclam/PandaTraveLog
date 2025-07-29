// Service Worker for PandaTraveLog PWA
const CACHE_NAME = 'pandatravelog-v2'; // Increment cache version

// Debug mode
const DEBUG = true;
const log = DEBUG ? console.log.bind(console, '[SW]') : () => {};

// Only cache essential static assets
const urlsToCache = [
  '/manifest.json',
  '/images/logo/logo-icon.png',
  '/favicon-32x32.png',
  '/images/po/emotions/happy.png',
  '/images/po/emotions/thinking.png',
  '/images/po/emotions/excited.png',
  '/images/po/emotions/confused.png'
];

// Critical paths that must bypass the service worker
const BYPASS_PATHS = [
  '/api/',
  '/trips',
  '/login',
  '/register',
  '/account',
  '/_next/',
  '/auth',
  'callback'
];

// Install event - cache resources with error handling
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Cache each URL individually to handle 404s gracefully
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(error => {
              console.warn(`Failed to cache ${url}:`, error);
              return null; // Continue with other URLs
            })
          )
        );
      })
      .catch(error => {
        console.error('Failed to open cache:', error);
      })
  );
  self.skipWaiting();
});

// Helper to check if a request should be cached
function shouldCache(url) {
  // Never cache certain paths
  if (neverCache.some(path => url.pathname.includes(path))) {
    return false;
  }

  // Never cache query parameters or auth tokens
  if (url.search || url.pathname.includes('token=')) {
    return false;
  }

  // Cache static assets
  if (
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/static/') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico')
  ) {
    return true;
  }

  return false;
}

// Enhanced fetch event handler
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Early bypass for critical paths
  if (BYPASS_PATHS.some(path => url.pathname.startsWith(path))) {
    log('Bypassing service worker for:', url.pathname);
    return;
  }

  // Only handle GET requests from our origin
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Handle navigation requests differently
  if (event.request.mode === 'navigate') {
    log('Navigation request:', url.pathname);
    // Don't cache navigation requests - let the browser handle them
    return;
  }

  // Only handle static assets
  if (!url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|json|woff2?)$/)) {
    return;
  }

  log('Handling fetch for:', url.pathname);

  event.respondWith(
    (async () => {
      try {
        // Try network first for fresh content
        const networkResponse = await fetch(event.request);
        
        if (networkResponse.ok) {
          // Cache successful responses
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
          log('Cached fresh response for:', url.pathname);
          return networkResponse;
        }

        // If network fails, try cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          log('Serving from cache:', url.pathname);
          return cachedResponse;
        }

        // If both fail, return network response anyway
        return networkResponse;

      } catch (error) {
        log('Fetch error:', error);
        // Last resort - check cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // If all fails, show offline response
        return new Response('Offline', { status: 503 });
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Push notification support (for future travel reminders)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New travel update from PandaTraveLog!',
    icon: '/images/logo/logo-icon.png',
    badge: '/favicon-32x32.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Trip',
        icon: '/images/logo/logo-icon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/images/logo/logo-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('PandaTraveLog', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app to trips page
    event.waitUntil(
      clients.openWindow('/trips')
    );
  }
});