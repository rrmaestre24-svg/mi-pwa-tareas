// Nombre de la caché - IMPORTANTE: Cambiado a v2 para la actualización
const CACHE_NAME = 'mis-tareas-v2';

// Archivos que se guardarán en caché para funcionar offline
const urlsToCache = [
  '/mi-pwa-tareas/',
  '/mi-pwa-tareas/index.html',
  '/mi-pwa-tareas/styles.css',
  '/mi-pwa-tareas/app.js',
  '/mi-pwa-tareas/manifest.json',
  '/mi-pwa-tareas/icons/icon-192.png',
  '/mi-pwa-tareas/icons/icon-512.png'
];

// Evento de instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker v2: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker v2: Archivos en caché');
        return cache.addAll(urlsToCache);
      })
  );
  
  // Forzar la activación inmediata del nuevo service worker
  self.skipWaiting();
});

// Evento de activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker v2: Activado');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker v2: Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Tomar control de todas las páginas inmediatamente
  return self.clients.claim();
});

// Evento fetch - intercepta las peticiones de red
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then((response) => {
          // No cachear respuestas no exitosas
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clonar la respuesta
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
      .catch(() => {
        console.log('Service Worker v2: Error al obtener recurso');
      })
  );
});

// Soporte para notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/mi-pwa-tareas/')
  );
});