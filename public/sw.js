/* Minecraft Math service worker: minimal and update-friendly.
   - Page visits: network-first so new Vercel deploys show up immediately.
     The last working page is kept only as an offline fallback.
   - Game files (JS/CSS/images): never cached by the worker, always fresh.
   - Old aggressive caches from earlier builds are deleted on activate. */
const SHELL = "mm-shell-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(self.skipWaiting().catch(() => undefined));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .catch(() => undefined)
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  // Only navigations are handled: everything else goes straight to the network.
  if (request.mode !== "navigate") return;
  e.respondWith(
    fetch(request)
      .then((r) => {
        if (r && r.ok) {
          const cp = r.clone();
          caches.open(SHELL).then((c) => c.put("/", cp)).catch(() => undefined);
        }
        return r;
      })
      .catch(() => caches.match("/"))
  );
});
