// ============================================================================
// ALACANTINAPP V3 - SERVICE WORKER (ARQUITECTURA OFFLINE-FIRST)
// ============================================================================
const CACHE_NAME = 'alacantinapp-v3-cache-v1'; 
const ASSETS_TO_CACHE = [ 
  './', 
  './index.html', 
  './styles.css',
  './app.js', 
  './manifest.json',
  './logo.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2' 
]; 

// 1. Instalación: Almacenar en caché todos los activos estáticos y librerías CDN
self.addEventListener('install', (event) => { 
  event.waitUntil( 
    caches.open(CACHE_NAME).then((cache) => { 
      console.log('[Service Worker v3] Cacheando recursos principales de la PWA...'); 
      return cache.addAll(ASSETS_TO_CACHE); 
    }).then(() => self.skipWaiting()) 
  ); 
}); 

// 2. Activación: Limpieza de cachés de versiones anteriores
self.addEventListener('activate', (event) => { 
  event.waitUntil( 
    caches.keys().then((cacheNames) => { 
      return Promise.all( 
        cacheNames.map((cache) => { 
          if (cache !== CACHE_NAME) { 
            console.log('[Service Worker v3] Eliminando caché antigua:', cache); 
            return caches.delete(cache); 
          } 
        }) 
      ); 
    }).then(() => self.clients.claim()) 
  ); 
}); 

// 3. Estrategia de Red/Caché: Stale-While-Revalidate con respaldo Offline
self.addEventListener('fetch', (event) => { 
  // Ignorar peticiones que no sean GET (como escrituras directas a Supabase)
  if (event.request.method !== 'GET') return; 

  event.respondWith( 
    caches.match(event.request).then((cachedResponse) => { 
      const fetchPromise = fetch(event.request).then((networkResponse) => { 
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') { 
          const responseToCache = networkResponse.clone(); 
          caches.open(CACHE_NAME).then((cache) => { 
            cache.put(event.request, responseToCache); 
          }); 
        } 
        return networkResponse; 
      }).catch((err) => { 
        console.log('[Service Worker v3] Modo sin conexión activado para:', event.request.url); 
      }); 

      // Responder inmediatamente desde la caché local si existe; en su defecto, consultar la red
      return cachedResponse || fetchPromise; 
    }) 
  ); 
});
