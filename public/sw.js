// Service Worker for PandaTraveLog PWA
const CACHE_NAME = 'pandatravelog-v1';
const urlsToCache = [
  '/',
  '/trips',
  '/login',
  '/account',
  '/manifest.json'
  // Only cache routes that actually exist
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
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
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
