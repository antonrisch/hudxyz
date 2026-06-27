import { cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

// copy the proxy runtime bundles into /public so the service worker and bare-mux
// worker can load them as same-origin static files. idempotent; run on install/build/dev.
const require = createRequire(import.meta.url);

// libcurl has no path export and its node condition resolves to lib/ (no browser
// bundle); walk up to the package root and take dist/ (where the browser index.mjs lives).
function distOf(spec) {
  let d = dirname(require.resolve(spec));
  while (!existsSync(join(d, "package.json"))) d = dirname(d);
  return join(d, "dist");
}

const pub = fileURLToPath(new URL("../public", import.meta.url));
cpSync(scramjetPath, `${pub}/scram`, { recursive: true });
cpSync(baremuxPath, `${pub}/baremux`, { recursive: true });
cpSync(distOf("@mercuryworkshop/libcurl-transport"), `${pub}/libcurl`, { recursive: true });
console.log("copied scram/baremux/libcurl into /public");
