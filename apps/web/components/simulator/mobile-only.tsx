"use client";

import type { ReactNode } from "react";
import { useMobileLayout } from "@/lib/use-mobile-layout";

export function MobileOnly({ children }: { children: ReactNode }) {
  if (!useMobileLayout()) return null;
  return children;
}

export function DesktopOnly({ children }: { children: ReactNode }) {
  if (useMobileLayout()) return null;
  return children;
}
