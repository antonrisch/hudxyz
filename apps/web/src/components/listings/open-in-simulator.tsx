import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OpenInSimulator({
  launchUrl,
  className,
}: {
  launchUrl: string;
  className?: string;
}) {
  const href = `/simulator?url=${encodeURIComponent(launchUrl)}`;

  return (
    <Link href={href} className={cn(buttonVariants({ variant: "brand", size: "lg" }), className)}>
      Open in simulator
    </Link>
  );
}
