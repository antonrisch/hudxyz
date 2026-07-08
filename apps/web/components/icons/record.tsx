import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";

// disc2-derived record mark: outer ring + filled center dot.
export const RecordIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = "currentColor", size = 24, strokeWidth = 2, className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" fill={color} stroke="none" />
    </svg>
  ),
);

RecordIcon.displayName = "RecordIcon";
