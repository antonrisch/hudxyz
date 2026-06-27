// scramjet 1.x service worker: proxies same-origin requests it owns, passes
// everything else straight through (so marketing routes are untouched).
importScripts("/scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

// the emulator pages are cross-origin isolated (COEP require-corp, for scramjet's
// wasm/SAB), so every proxied response must opt into isolation or the iframe — and
// its subresources — get blocked.
function isolate(res) {
  const headers = new Headers(res.headers);
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

async function handle(event) {
  await scramjet.loadConfig();
  if (!scramjet.route(event)) return fetch(event.request);
  return isolate(await scramjet.fetch(event));
}

self.addEventListener("fetch", (event) => {
  event.respondWith(handle(event));
});
