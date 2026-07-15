import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function moveItem<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items.slice();
  const next = items.slice();
  const [row] = next.splice(index, 1);
  if (!row) return items.slice();
  next.splice(target, 0, row);
  return next;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
