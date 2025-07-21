// Service Worker for PandaTraveLog PWA
const CACHE_NAME = 'pandatravelog-v1';

// Only cache static assets, not dynamic routes that require authentication
const urlsToCache = [
  '/',
  '/manifest.json',
  '/images/logo/logo-icon.png',
  '/favicon-32x32.png'
  // Removed dynamic routes like /trips, /login, /account
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

// Fetch event - handle requests with proper redirect support
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip external URLs
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Skip dynamic/auth routes - let browser handle these normally with redirects
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/trips') ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/register') ||
    url.pathname.startsWith('/account') ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.includes('auth') ||
    url.pathname.includes('callback')
  ) {
    // Let the browser handle these requests normally
    return;
  }
  
  // Only intercept and cache static assets and the homepage
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        // Fetch with proper redirect handling
        return fetch(event.request, {
          redirect: 'follow',
          credentials: 'same-origin'
        }).then((fetchResponse) => {
          // Don't cache redirect responses
          if (fetchResponse.type === 'opaqueredirect') {
            return fetchResponse;
          }
          
          // Cache successful responses for static assets
          if (fetchResponse.ok && fetchResponse.status === 200) {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          
          return fetchResponse;
        }).catch(error => {
          console.warn('Fetch failed for', event.request.url, error);
          // Return cached version as fallback
          return caches.match('/') || new Response('Offline', { status: 503 });
        });
      })
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