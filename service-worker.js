// Nombre de la caché - cambiar versión cuando actualices archivos
const CACHE_NAME = 'mis-tareas-v1';

// Archivos que se guardarán en caché para funcionar offline
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Evento de instalación del Service Worker
// Se ejecuta cuando se instala por primera vez
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');
  
  event.waitUntil(
    // Abrir la caché y guardar todos los archivos
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Archivos en caché');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de activación del Service Worker
// Se ejecuta después de la instalación
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activado');
  
  event.waitUntil(
    // Limpiar cachés antiguos
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminando caché antigua');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Evento fetch - intercepta las peticiones de red
// Estrategia: Cache First (primero busca en caché, luego en red)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si encuentra el archivo en caché, lo devuelve
        if (response) {
          return response;
        }
        // Si no está en caché, lo busca en la red
        return fetch(event.request);
      })
      .catch(() => {
        // Si falla todo, podrías devolver una página offline personalizada
        console.log('Service Worker: Error al obtener recurso');
      })
  );
});