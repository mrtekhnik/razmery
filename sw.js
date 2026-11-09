// Офлайн-кэш «Размеры на фото».
// ВАЖНО: при каждом обновлении приложения увеличивать VERSION —
// по этому изменению телефон узнаёт, что вышла новая версия, и показывает кнопку «Обновить».
// Удаляются только свои старые кэши (razmery-*): на домене mrtekhnik.github.io живут и другие приложения.
// Библиотеки PDF (папка lib/) лежат в отдельном кэше LIB_CACHE: он не сбрасывается при обновлении приложения
// и скачивается заново только при смене LIB_VERSION.
const VERSION = '1.42';
const CACHE = 'razmery-' + VERSION;
const LIB_VERSION = '1';
const LIB_CACHE = 'razmery-lib-' + LIB_VERSION;
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png'];
const LIBS = ['./lib/pdf.min.mjs', './lib/pdf.worker.min.mjs', './lib/pdf-lib.min.js'];

// показывается, только если приложение не нашлось ни в одном сохранённом кэше и сети нет
const OFFLINE_PAGE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Размеры на фото</title>'
  + '<body style="margin:0;font-family:sans-serif;background:#1d2733;color:#e9eef5;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">'
  + '<div style="padding:24px"><h2>Нет сети</h2><p>Сохранённая копия приложения не найдена (код R1).<br>Подключитесь к интернету и нажмите «Повторить».</p>'
  + '<button onclick="location.reload()" style="font-size:18px;padding:12px 24px;border:0;border-radius:10px;background:#1f6feb;color:#fff">Повторить</button></div>';

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
  const nav = req.mode === 'navigate';
  e.respondWith((async () => {
    try {
      const cache = await caches.open(isLib ? LIB_CACHE : CACHE);
      let hit = await cache.match(nav ? './index.html' : req, {ignoreSearch: true});
      // запасной путь: копия из кэша прошлой версии приложения (если текущий кэш почему-то пуст)
      if (!hit) hit = await caches.match(nav ? new URL('./index.html', self.registration.scope).href : req, {ignoreSearch: true});
      if (hit) return hit;
      const res = await fetch(req);
      if (isLib && res.ok) cache.put(req, res.clone());
      return res;
    } catch (_) {
      if (!nav) return new Response('', {status: 503});
      return new Response(OFFLINE_PAGE, {status: 503, headers: {'Content-Type': 'text/html; charset=utf-8'}});
    }
  })());
});
