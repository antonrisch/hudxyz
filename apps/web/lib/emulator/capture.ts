import { snapdom } from "@zumer/snapdom";
import { VIEWPORT } from "@/lib/emulator/config";

const CAPTURE = {
  width: VIEWPORT,
  height: VIEWPORT,
  dpr: 1,
  backgroundColor: "#000",
} as const;

function captureFilename() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `mrbd-${stamp}.png`;
}

async function waitForIframeDocument(iframe: HTMLIFrameElement): Promise<Document | null> {
  for (let i = 0; i < 100; i++) {
    try {
      const doc = iframe.contentDocument;
      if (doc?.body && (doc.body.childNodes.length > 0 || doc.readyState === "complete"))
        return doc;
    } catch {
      return null;
    }
    await new Promise((r) => requestAnimationFrame(r));
  }
  return null;
}

// same-origin proxied app — independent of host view chrome (glasses scale, pan/zoom, etc.).
function waveguideRoot(doc: Document): HTMLElement {
  return doc.body?.childNodes.length ? doc.body : doc.documentElement;
}

// rasterize the 600×600 waveguide from the iframe document, not the host #hud-display wrapper
// (glasses view css-scales that wrapper and snapdom mis-measures it).
export async function downloadDisplay(iframe: HTMLIFrameElement) {
  const doc = await waitForIframeDocument(iframe);
  if (!doc) return;

  await snapdom.download(waveguideRoot(doc), {
    ...CAPTURE,
    format: "png",
    filename: captureFilename(),
  });
}
