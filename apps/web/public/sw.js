// scramjet v2 service worker (CLASSIC — registered without { type: "module" }).
// controller.sw.js is importScripts()'d and exposes $scramjetController.shouldRoute/route;
// it self-handles install(skipWaiting)/activate(clients.claim).
importScripts("/controller/controller.sw.js");

// the emulator host is cross-origin isolated (COEP require-corp). every proxied response
// must opt into isolation or the same-origin iframe — and its subresources — get blocked.
// drop this wrapper only if you also drop COEP in next.config.
function isolate(res) {
  const headers = new Headers(res.headers);
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

self.addEventListener("fetch", (event) => {
  // shouldRoute() is false for marketing routes + the host page → fall through to network.
  if ($scramjetController.shouldRoute(event)) {
    event.respondWith($scramjetController.route(event).then(isolate));
  }
});
