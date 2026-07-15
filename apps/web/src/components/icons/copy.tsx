import { forwardRef } from "react";
import { Copy as LucideCopy, type LucideProps } from "lucide-react";

import { cn } from "@/lib/utils";

export const Copy = forwardRef<SVGSVGElement, LucideProps>(({ className, ...props }, ref) => (
  <LucideCopy ref={ref} className={cn("-rotate-90", className)} {...props} />
));

Copy.displayName = "Copy";
