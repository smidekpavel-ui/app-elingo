// Service worker: aplikace funguje offline. Karty se sem NIKDY nedostanou –
// jsou jen v IndexedDB v zařízení, soubor karty.json se nestahuje ze serveru.
const VERZE = 'elingo-v6';
const SOUBORY = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './js/app.js',
  './js/datum.js',
  './js/db.js',
  './js/jednotky.js',
  './js/leitner.js',
  './js/lekce.js',
  './js/porovnani.js',
  './js/serie.js',
  './js/slouceni.js',
  './js/tema.js',
  './js/ui.js',
  './js/uvod.js',
  './js/vyber.js',
  './karty.ukazka.json',
  './icons/ikona-192.png',
  './icons/ikona-512.png',
  './icons/ikona-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERZE).then((c) => c.addAll(SOUBORY)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((klice) => Promise.all(klice.filter((k) => k !== VERZE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'aktualizovat') self.skipWaiting();
});

// Nejdřív cache (rychlé a offline), na pozadí stáhnout novou verzi.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (/\/karty\.json$/.test(url.pathname)) return; // nikdy necachovat ostrá data
  e.respondWith(
    caches.open(VERZE).then(async (cache) => {
      const ulozeno = await cache.match(e.request, { ignoreSearch: true });
      const sit = fetch(e.request)
        .then((odp) => { if (odp.ok) cache.put(e.request, odp.clone()); return odp; })
        .catch(() => null);
      return ulozeno || (await sit) || (e.request.mode === 'navigate' ? cache.match('./index.html') : Response.error());
    }),
  );
});
