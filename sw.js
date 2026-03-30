// Resolve Library — Service Worker
// Caches the app shell so it works offline

const CACHE = 'resolve-library-v1';
const SHELL = [
  './',
  './index.html',
  './add.html',
  './add-video.html',
  './videos.html',
  './nodegraph.html',
  './spline.html',
  './settings.html',
  './nodes-data.js',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap',
];

// Install — cache all shell files
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for shell, network-first for everything else
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go network for external GIFs / favicons / YouTube embeds
  if (!url.origin.includes(self.location.origin) &&
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('fonts.gstatic.com')) {
    return; // let browser handle it natively
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        // Cache successful GET responses for shell files
        if (resp.ok && e.request.method === 'GET') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => {
        // Offline fallback — return index.html for navigation requests
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
