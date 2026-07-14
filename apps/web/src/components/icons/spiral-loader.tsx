import { forwardRef } from "react";
import { Loader, type LucideProps } from "lucide-react";

import { cn } from "@/lib/utils";

import styles from "./icons.module.css";

/** Lucide `Loader` with staggered spoke opacity (SVG does not rotate). */
export const SpiralLoader = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, ...props }, ref) => (
    <Loader ref={ref} aria-hidden className={cn(styles.spiralLoader, className)} {...props} />
  ),
);

SpiralLoader.displayName = "SpiralLoader";
