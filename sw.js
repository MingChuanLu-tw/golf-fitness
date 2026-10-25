// 離線快取。修改任何檔案（包括 program.json）後，把 VERSION 加 1，裝置就會出現「有新版本」。
const VERSION = "gf-v2";
const FILES = ["./", "index.html", "styles.css", "program.json", "manifest.webmanifest",
  "js/app.js", "js/db.js", "js/engine.js", "js/sync.js", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES))));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("message", e => { if (e.data === "skip") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;   // Apps Script、YouTube 不快取
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
