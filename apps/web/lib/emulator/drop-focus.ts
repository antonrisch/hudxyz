import type { MouseEvent } from "react";

// keep controls from taking focus so physical d-pad keys stay live
export const dropFocus = (e: MouseEvent) => e.preventDefault();
