import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";

export const Share = forwardRef<SVGSVGElement, LucideProps>(
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
      <path d="M12 2V15M15 5 12 2 9 5M15 9H17A2 2 0 0119 11V19A2 2 0 0117 21H7A2 2 0 015 19V11A2 2 0 017 9H9" />
    </svg>
  ),
);

Share.displayName = "Share";
