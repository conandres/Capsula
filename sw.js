/* Service worker de Cápsula: funciona sin internet.
   Los archivos se piden primero a la red, así que las actualizaciones llegan solas. */
const VERSION='capsula-v61';
const SHELL = ['legal/terminos.html','legal/privacidad.html','legal/eliminar-cuenta.html',
  './', './index.html', './manifest.json', './config.js', './cloud.js',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/maskable-192.png', './icons/maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png',
  './img/t-comer.png', './img/t-banar.png', './img/t-dormir.png', './img/t-jugar.png', './img/lumis.png', './img/xp.png', './img/lumis-lg.png', './img/xp-lg.png'
];

/* Mascota 3D: se guarda para que también cargue sin internet (si falla, no se detiene la instalación). */
const EXTRA = ['./lab3d/capsula-pets.js', 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL).then(() =>
    Promise.all(EXTRA.map(u => c.add(new Request(u, { mode: 'cors' })).catch(() => {}))))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Sign-In y cualquier otro dominio: directo a la red, sin caché.
  // Fuentes y librería de Firebase se guardan para que la app abra sin internet.
  const isLib = url.hostname === 'cdn.jsdelivr.net' && url.pathname.startsWith('/npm/three@');
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' ||
    (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) || isLib;
  if (url.origin !== location.origin && !isFont) return;

  // Fuentes: usa la guardada y actualiza en segundo plano
  if (isFont) {
    e.respondWith(
      caches.open(VERSION).then(cache =>
        cache.match(req).then(hit => {
          const net = fetch(req).then(res => { cache.put(req, res.clone()); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  // Archivos de la app: primero la red (así los celulares siempre ven la versión nueva);
  // si no hay internet, se usa la copia guardada.
  e.respondWith(
    fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
