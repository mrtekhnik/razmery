// Офлайн-кэш «Размеры на фото».
// ВАЖНО: при каждом обновлении приложения увеличивать VERSION —
// по этому изменению телефон узнаёт, что вышла новая версия, и показывает кнопку «Обновить».
// Удаляются только свои старые кэши (razmery-*): на домене mrtekhnik.github.io живут и другие приложения.
const VERSION = '1.15';
const CACHE = 'razmery-' + VERSION;
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png'];

self.addEventListener('install', e => {
  // Новая версия скачивается целиком и ждёт, пока пользователь нажмёт «Обновить».
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'reload'})))));
});
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('razmery-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req.mode === 'navigate' ? './index.html' : req, {ignoreSearch: true});
    if (hit) return hit;
    try { return await fetch(req); } catch (_) { return new Response('Нет сети', {status: 503}); }
  }));
});
