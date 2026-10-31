// Офлайн-кэш «Размеры на фото».
// ВАЖНО: при каждом обновлении приложения увеличивать VERSION —
// по этому изменению телефон узнаёт, что вышла новая версия, и показывает кнопку «Обновить».
// Удаляются только свои старые кэши (razmery-*): на домене mrtekhnik.github.io живут и другие приложения.
// Библиотеки PDF (папка lib/) лежат в отдельном кэше LIB_CACHE: он не сбрасывается при обновлении приложения
// и скачивается заново только при смене LIB_VERSION.
const VERSION = '1.36';
const CACHE = 'razmery-' + VERSION;
const LIB_VERSION = '1';
const LIB_CACHE = 'razmery-lib-' + LIB_VERSION;
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png'];
const LIBS = ['./lib/pdf.min.mjs', './lib/pdf.worker.min.mjs', './lib/pdf-lib.min.js'];

self.addEventListener('install', e => {
  // Новая версия скачивается целиком и ждёт, пока пользователь нажмёт «Обновить».
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(FILES.map(f => new Request(f, {cache: 'reload'})));
    const lc = await caches.open(LIB_CACHE);
    for (const f of LIBS) {
      if (!(await lc.match(f))) { try { await lc.add(new Request(f, {cache: 'reload'})); } catch (_) {} }
    }
  })());
});
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('razmery-') && k !== CACHE && k !== LIB_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isLib = new URL(req.url).pathname.includes('/lib/');
  e.respondWith((async () => {
    const cache = await caches.open(isLib ? LIB_CACHE : CACHE);
    const hit = await cache.match(req.mode === 'navigate' ? './index.html' : req, {ignoreSearch: true});
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (isLib && res.ok) cache.put(req, res.clone());
      return res;
    } catch (_) { return new Response('Нет сети', {status: 503}); }
  })());
});
