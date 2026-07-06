import { KEY_BY_INTENT } from "@/lib/emulator/config";
import type { Intent } from "@/lib/emulator/store";

const CODE_BY_INTENT: Record<Intent, string> = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  select: "Enter",
  back: "Escape",
};

// host chrome fields that should keep arrow/enter keys for themselves
export function isHostChromeInput(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    tag === "BUTTON" ||
    node.isContentEditable
  );
}

function resolveInjectionTarget(doc: Document): HTMLElement | null {
  const win = doc.defaultView as (Window & { HTMLElement: typeof HTMLElement }) | null;
  if (!win?.HTMLElement) return null;

  const active = doc.activeElement instanceof win.HTMLElement ? doc.activeElement : null;
  if (active && active !== doc.body && active !== doc.documentElement) return active;

  // meta sample: .focusable elements on the active screen
  return (
    doc.querySelector<HTMLElement>(".focusable:not([disabled]):not(.hidden)") ??
    doc.querySelector<HTMLElement>(".screen.active .focusable") ??
    doc.body ??
    doc.documentElement
  );
}

// synthesize the glasses' arrow/enter/escape keys into the proxied app realm.
// always inject from the host — never rely on the iframe holding host focus, so
// d-pad clicks and physical keyboard share one path (matches meta: keydown on document).
export function dispatchDeviceKey(
  iframe: HTMLIFrameElement | null,
  intent: Intent,
  type: "keydown" | "keyup",
): boolean {
  const win = iframe?.contentWindow;
  if (!win) return false;

  try {
    const doc = win.document;
    const target = resolveInjectionTarget(doc);
    if (!target) return false;

    target.focus?.({ preventScroll: true });

    const Ev = (win as Window & { KeyboardEvent: typeof KeyboardEvent }).KeyboardEvent;
    const key = KEY_BY_INTENT[intent];
    const handled = !target.dispatchEvent(
      new Ev(type, { key, code: CODE_BY_INTENT[intent], bubbles: true, cancelable: true }),
    );

    if (type === "keydown" && intent === "select" && !handled) {
      const activatable = target.matches(
        'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="menuitem"], .focusable',
      );
      if (activatable) target.click?.();
    }

    return true;
  } catch {
    // frame not loaded / not same-origin yet
    return false;
  }
}
