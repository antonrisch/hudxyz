"use client";

// scramjet 1.x same-origin proxy. globals come from the IIFE bundles copied into
// /public (scripts/copy-proxy-assets.mjs); network egress goes through the wisp server.

type Controller = { init: () => void; encodeUrl: (url: string) => string };
type Connection = {
  getTransport: () => Promise<string | null>;
  setTransport: (path: string, opts: unknown[]) => Promise<void>;
};
declare const $scramjetLoadController: () => { ScramjetController: new (cfg: unknown) => Controller };
declare const BareMux: { BareMuxConnection: new (worker: string) => Connection };

// dev: a local wisp process on :4000. prod: set NEXT_PUBLIC_WISP_URL to the host.
const wispUrl = () =>
  process.env.NEXT_PUBLIC_WISP_URL ||
  (location.hostname === "localhost"
    ? "ws://localhost:4000/wisp/"
    : `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/`);

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(s);
  });
}

let ready: Promise<Controller> | null = null;

// idempotent: load bundles, init the controller, register the SW, point bare-mux
// at the wisp endpoint. resolves to the controller.
function ensure(): Promise<Controller> {
  if (ready) return ready;
  ready = (async () => {
    await loadScript("/scram/scramjet.all.js");
    await loadScript("/baremux/index.js");
    const { ScramjetController } = $scramjetLoadController();
    const scramjet = new ScramjetController({
      files: {
        wasm: "/scram/scramjet.wasm.wasm",
        all: "/scram/scramjet.all.js",
        sync: "/scram/scramjet.sync.js",
      },
    });
    scramjet.init();
    await navigator.serviceWorker.register("/sw.js");
    const conn = new BareMux.BareMuxConnection("/baremux/worker.js");
    // libcurl 1.5.x reads either key; pass both so the wisp socket connects
    const ws = wispUrl();
    if ((await conn.getTransport()) !== "/libcurl/index.mjs") {
      await conn.setTransport("/libcurl/index.mjs", [{ wisp: ws, websocket: ws }]);
    }
    return scramjet;
  })();
  return ready;
}

// encode a target url into the same-origin proxied path (assign to iframe.src)
export async function encodeUrl(url: string): Promise<string> {
  return (await ensure()).encodeUrl(url);
}
