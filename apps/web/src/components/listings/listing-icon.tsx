import Image from "next/image";

import { cn } from "@/lib/utils";

const iconClassName = "shrink-0 overflow-hidden rounded-squircle object-cover";

export function ListingIcon({
  src,
  alt,
  size = 48,
  className,
}: {
  src: string | null;
  alt: string;
  size?: number;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(iconClassName, "bg-muted", className)}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  // next/image does not optimize SVG; sample icons include tools.svg.
  if (src.endsWith(".svg")) {
    return (
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={cn(iconClassName, className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn(iconClassName, className)}
    />
  );
}
