// wait until the proxied iframe has a document with content and has painted.
export async function waitForIframePaint(
  iframe: HTMLIFrameElement,
  isStale: () => boolean,
): Promise<boolean> {
  for (let i = 0; i < 150; i++) {
    if (isStale()) return false;
    try {
      const doc = iframe.contentDocument;
      if (doc?.body && (doc.body.childNodes.length > 0 || doc.readyState === "complete")) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        return !isStale();
      }
    } catch {
      return false;
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  return false;
}
