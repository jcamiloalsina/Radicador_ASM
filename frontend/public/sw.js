const CACHE_NAME = 'asomunicipios-v1';
const STATIC_CACHE = 'asomunicipios-static-v1';
const DATA_CACHE = 'asomunicipios-data-v1';
const MAP_CACHE = 'asomunicipios-maps-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-asomunicipios.png'
];

// API endpoints to cache for offline use
const CACHEABLE_API_ROUTES = [
  '/api/predios',
  '/api/municipios'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('asomunicipios-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle map tile requests (OpenStreetMap, etc.)
  if (isMapTileRequest(url)) {
    event.respondWith(handleMapTileRequest(request));
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          // Cache static assets
          if (networkResponse.ok && shouldCacheStatic(url)) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // Return offline page if available
        if (request.destination === 'document') {
          return caches.match('/');
        }
        return new Response('Offline', { status: 503 });
      })
  );
});

// Handle API requests with network-first, cache-fallback strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Check if this is a cacheable API route
  const isCacheable = CACHEABLE_API_ROUTES.some(route => url.pathname.includes(route));
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && isCacheable) {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(DATA_CACHE);
      await cache.put(request, responseClone);
      console.log('[SW] Cached API response:', url.pathname);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', url.pathname);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', url.pathname);
      return cachedResponse;
    }
    
    // Return offline response for API
    return new Response(
      JSON.stringify({ 
        error: 'Sin conexión', 
        offline: true,
        message: 'No hay conexión a internet. Los datos mostrados pueden no estar actualizados.'
      }),
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Check if request is for map tiles
function isMapTileRequest(url) {
  const mapProviders = [
    'tile.openstreetmap.org',
    'tiles.stadiamaps.com',
    'server.arcgisonline.com',
    'cartodb-basemaps',
    'mt0.google.com',
    'mt1.google.com'
  ];
  return mapProviders.some(provider => url.hostname.includes(provider));
}

// Handle map tile requests with cache-first strategy
async function handleMapTileRequest(request) {
  const cache = await caches.open(MAP_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Return cached tile but also update in background
    fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse);
      }
    }).catch(() => {});
    
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return a placeholder or error for map tiles
    return new Response('', { status: 404 });
  }
}

// Check if static asset should be cached
function shouldCacheStatic(url) {
  const cacheableExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2'];
  return cacheableExtensions.some(ext => url.pathname.endsWith(ext));
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_PREDIOS') {
    // Cache specific predios data
    const prediosData = event.data.payload;
    caches.open(DATA_CACHE).then((cache) => {
      const response = new Response(JSON.stringify(prediosData));
      cache.put('/api/predios/cached', response);
      console.log('[SW] Cached predios data for offline use');
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      names.forEach((name) => {
        if (name.startsWith('asomunicipios-')) {
          caches.delete(name);
        }
      });
    });
    console.log('[SW] Cache cleared');
  }
});

// Background sync for offline actions (future feature)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('[SW] Background sync triggered');
    // Handle background sync when online
  }
});

console.log('[SW] Service Worker loaded');
