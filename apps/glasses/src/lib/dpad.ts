// d-pad focus navigation for glasses lenses: arrows move focus across visible
// [data-focusable] elements, Enter activates. the device emits no Escape, so
// every actionable control must be a focusable element reachable this way.

export function focusables(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-focusable]"))
    .filter((el) => el.offsetParent !== null); // visible only
}

export function focusFirst(root: ParentNode): void {
  focusables(root)[0]?.focus();
}

export function moveFocus(root: ParentNode, dir: number): void {
  const f = focusables(root);
  if (!f.length) return;
  let i = f.indexOf(document.activeElement as HTMLElement);
  i = i < 0 ? 0 : (i + dir + f.length) % f.length;
  f[i].focus();
}

export function activateFocused(): void {
  (document.activeElement as HTMLElement)?.closest<HTMLElement>("[data-focusable]")?.click();
}

// map a keydown to list navigation within `root`. returns true (and preventDefaults)
// when handled; false for keys it doesn't own so the caller can handle them.
export function handleListNav(e: KeyboardEvent, root: ParentNode): boolean {
  if (e.key === "ArrowUp" || e.key === "ArrowLeft") moveFocus(root, -1);
  else if (e.key === "ArrowDown" || e.key === "ArrowRight") moveFocus(root, 1);
  else if (e.key === "Enter") activateFocused();
  else return false;
  e.preventDefault();
  return true;
}

// bridge for the Lenswolf emulator: a cross-origin iframe can't receive injected
// key events, so the emulator posts gestures and we re-dispatch them as keydown —
// existing lens handlers then react with no per-lens changes.
// contract: postMessage({ source: "lenswolf-emulator", type: "gesture", key: "ArrowUp" })
export function listenForEmulator(): void {
  window.addEventListener("message", (e: MessageEvent) => {
    const d = e.data;
    if (d?.source === "lenswolf-emulator" && d.type === "gesture" && typeof d.key === "string") {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: d.key, bubbles: true, cancelable: true }));
    }
  });
}
