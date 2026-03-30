// Resolve Library — Service Worker
// Bump CACHE version whenever you deploy new files — this forces old cache out.

const CACHE = 'resolve-library-v6';
const SHELL = [
  './',
  './index.html',
  './add.html',
  './add-video.html',
  './videos.html',
  './nodegraph.html',
  './spline.html',
  './settings.html',
  './nodes-reference.html',
  './nodes-data.js',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap',
];

// Install — cache all shell files
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Activate — delete ALL old caches, claim clients immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first for HTML (always get latest), cache-first for assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Pass through external requests (GIFs, YouTube, favicons)
  if (url.origin !== self.location.origin &&
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('fonts.gstatic.com')) {
    return;
  }

  const isHTML = url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === '';

  if (isHTML) {
    // Network-first for HTML — always try to get the latest version
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first for JS/CSS/fonts
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (resp.ok && e.request.method === 'GET') {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        }).catch(() => {
          if (e.request.mode === 'navigate') return caches.match('./index.html');
        });
      })
    );
  }
});
