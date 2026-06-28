"use client";

// scramjet v2 same-origin proxy. the IIFE bundles (copied into /public by
// scripts/copy-proxy-assets.mjs) set self.$scramjet + globalThis.$scramjetController;
// the Controller takes a ProxyTransport directly (no bare-mux). egress via wisp.

import type { Controller, Frame } from "@mercuryworkshop/scramjet-controller";

// controller.api.js sets this global. we read the class off it at runtime instead of
// importing the npm stub, which eagerly destructures globalThis.$scramjetController at
// module-eval and would crash under next hydration before the IIFE has run.
declare const $scramjetController: {
  Controller: new (init: { serviceworker: ServiceWorker; transport: object }) => Controller;
};

// dev: a local wisp process on :4000. prod: set NEXT_PUBLIC_WISP_URL to the host.
// libcurl requires a ws://|wss:// url that ENDS WITH a trailing "/".
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

// idempotent: load the engine + controller IIFE bundles (classic scripts so the globals
// get set), register the classic SW and wait until it controls the page, build the wisp
// transport, construct the Controller and await wasm + SW handshake.
function ensure(): Promise<Controller> {
  if (ready) return ready;
  ready = (async () => {
    // order matters: scramjet.js sets self.$scramjet, which the Controller constructor
    // asserts (assertRuntimeScramjetVersion) before controller.api.js exposes the class.
    await loadScript("/scramjet/scramjet.js");
    await loadScript("/controller/controller.api.js");

    // classic SW (NOT { type: "module" }): controller.sw.js is an IIFE relying on importScripts.
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    // controller.sw.js calls clients.claim(); wait for it to actually control this page
    // before constructing the Controller, or the first frame.go() won't be intercepted.
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((r) =>
        navigator.serviceWorker.addEventListener("controllerchange", () => r(), { once: true }),
      );
    }
    const serviceworker = navigator.serviceWorker.controller ?? reg.active;
    if (!serviceworker) throw new Error("scramjet: no active service worker");

    // wisp-backed transport (replaces bare-mux + the /libcurl worker asset). lazy import
    // keeps the ~1MB libcurl bundle out of the route's initial JS.
    const { default: LibcurlClient } = await import("@mercuryworkshop/libcurl-transport");
    const transport = new LibcurlClient({ wisp: wispUrl() });

    // assets live at the controller's DEFAULT paths (/scramjet/*, /controller/*, prefix
    // /~/sj/), so no `config` override is needed. wasm is auto-fetched by the constructor.
    const controller = new $scramjetController.Controller({ serviceworker, transport });
    await controller.wait(); // wasm load + SW handshake; replaces v1 scramjet.init()
    return controller;
  })();
  return ready;
}

// attach our own <iframe> to the controller and return its navigable Frame. frame.element
// === the passed iframe, so the emulator keeps injecting keys via iframe.contentWindow.
// navigate with frame.go(url) — v2 has no encodeUrl helper.
export async function createFrame(iframe: HTMLIFrameElement): Promise<Frame> {
  return (await ensure()).createFrame(iframe);
}
