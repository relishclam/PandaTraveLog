// Service Worker for PandaTraveLog PWA
const CACHE_NAME = 'pandatravelog-v4';
const ASSETS_CACHE = 'assets-v4';
const API_CACHE = 'api-v4';

// Debug mode
const DEBUG = true;
const log = DEBUG ? console.log.bind(console, '[SW]') : () => {};

// Critical assets that must be cached immediately
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/images/logo/logo-icon.png',
  '/images/logo/apple-icon-180x180.png',
  '/images/logo/android-icon-192x192.png',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/images/po/emotions/happy.png',
  '/images/po/emotions/thinking.png',
  '/images/po/emotions/excited.png',
  '/images/po/emotions/confused.png'
];

const urlsToCache = [
  '/',
  '/manifest.json',
  '/panda-maps-icon.png',
  '/images/po/emotions/happy.png',
  '/images/po/emotions/thinking.png',
  '/images/po/emotions/excited.png',
  '/images/po/emotions/confused.png',
  '/images/po/emotions/sad.png'
];

// Function to check if a URL is auth-related
const isAuthRelated = (url) => {
  const authPaths = ['/login', '/register', '/auth', '/callback', '/token', '/logout'];
  const authPatterns = [
    /^\/auth\/v\d+\//,
    /\/(login|logout|token|callback)/,
    /\?token=/,
    /\.auth\./,
    /auth/i
  ];
  
  return authPaths.some(path => url.pathname.includes(path)) ||
         authPatterns.some(pattern => pattern.test(url.href));
};

// Critical paths that must bypass the service worker
const BYPASS_PATHS = [
  '/api/',
  '/trips',
  '/login',
  '/register',
  '/account',
  '/_next/',
  '/auth/',
  'callback',
  'token',
  'logout'
];

// Additional auth-related patterns to bypass
const AUTH_PATTERNS = [
  /^\/auth\/v\d+\//,  // Match any versioned auth endpoints
  /\/(login|logout|token|callback)/,  // Match auth-related paths
  /\?token=/  // Match URLs with auth tokens
];

// Install event - cache resources with error handling
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
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
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip auth-related requests
  if (event.request.url.includes('/auth/') || 
      event.request.url.includes('/login') || 
      event.request.url.includes('/register')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response
        const responseToCache = response.clone();
        
        // Cache successful responses
        if (response.ok) {
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request);
      })
  );
});

// Activate event - clean up old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up ALL caches first
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Then open our new cache
      caches.open(CACHE_NAME).then(cache => {
        console.log('Creating new cache:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      }),
      // Finally claim clients
      self.clients.claim().then(() => {
        console.log('Service worker claimed all clients');
      })
    ]).catch(error => {
      console.error('Service worker activation error:', error);
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