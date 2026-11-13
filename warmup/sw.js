// 離線快取。修改任何檔案（包括 warmup.json）後，把 VERSION 加 1，裝置就會出現「有新版本」。
const VERSION = "gw-v2";
const FILES = ["./", "index.html", "styles.css", "app.js", "warmup.json", "manifest.webmanifest",
  "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES))));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("gw-") && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("message", e => { if (e.data === "skip") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;   // YouTube 不快取
  // 找不到快取就抓網路並補回快取：健身 app 的 service worker 更新時會清掉同網域的其他快取（包括這裡的），
  // 有網路時打開一次熱身 app 就會補回來。
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(VERSION).then(c => (e.request.mode === "navigate" ? c.addAll(FILES) : c.put(e.request, copy))).catch(() => {});
    }
    return res;
  })));
});
