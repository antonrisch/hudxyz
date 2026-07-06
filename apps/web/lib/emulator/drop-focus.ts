import type { MouseEvent } from "react";
import { isHostChromeInput } from "@/lib/emulator/input";

// keep controls from taking focus so physical d-pad keys stay live
export const dropFocus = (e: MouseEvent) => e.preventDefault();

// return to device input after interacting with sidebar chrome (sliders, url bar, etc.)
export function releaseChromeFocus() {
  const el = document.activeElement;
  if (isHostChromeInput(el)) (el as HTMLElement).blur();
}
