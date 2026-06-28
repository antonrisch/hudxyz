import { cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";

// copy the v2 proxy runtime into /public so the host page (scramjet.js + controller.api.js),
// the service worker (controller.sw.js) and proxied frames (controller.inject.js, scramjet.wasm)
// load it as same-origin static files at the controller's DEFAULT paths. idempotent.
const require = createRequire(import.meta.url);

// scramjet-controller has no /path export; walk from its resolved entry up to the
// package root and take dist/ (controller.api.js / controller.sw.js / controller.inject.js).
function distOf(spec) {
  let d = dirname(require.resolve(spec));
  while (!existsSync(join(d, "package.json"))) d = dirname(d);
  return join(d, "dist");
}

const pub = fileURLToPath(new URL("../public", import.meta.url));
cpSync(scramjetPath, `${pub}/scramjet`, { recursive: true });
cpSync(distOf("@mercuryworkshop/scramjet-controller"), `${pub}/controller`, { recursive: true });
console.log("copied scramjet + controller into /public");
