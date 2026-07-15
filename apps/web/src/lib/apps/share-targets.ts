import type { ComponentType } from "react";

import { FacebookIcon } from "@/components/icons/facebook";
import { LinkedInIcon } from "@/components/icons/linkedin";
import { RedditIcon } from "@/components/icons/reddit";
import { XIcon } from "@/components/icons/x";
import { WhatsAppIcon } from "@/components/icons/whatsapp";

export type SocialShareChannel = "reddit" | "x" | "linkedin" | "facebook" | "whatsapp";

export type ShareTarget = {
  name: SocialShareChannel;
  label: string;
  href: (url: string, title: string) => string;
  className?: string;
  iconClassName?: string;
  Icon: ComponentType<{ className?: string }>;
};

export function listingShareUrl(pageUrl: string, utmSource: string) {
  return `${pageUrl}?utm_source=${utmSource}`;
}

export function listingShareTitle(name: string) {
  const base = name.trim() || "This app";
  return `${base} - hudxyz.com Store`;
}

export const LISTING_SHARE_TARGETS: ShareTarget[] = [
  {
    name: "reddit",
    label: "Share on Reddit",
    href: (url, title) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    className: "bg-[#FF4500]",
    iconClassName: "scale-140",
    Icon: RedditIcon,
  },
  {
    name: "x",
    label: "Share on X",
    href: (url, title) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    className: "bg-black text-white",
    Icon: XIcon,
  },
  {
    name: "linkedin",
    label: "Share on LinkedIn",
    href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    className: "bg-[#0A66C2] text-white",
    Icon: LinkedInIcon,
  },
  {
    name: "facebook",
    label: "Share on Facebook",
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    className: "bg-[#1877F2] text-white",
    iconClassName: "scale-120",
    Icon: FacebookIcon,
  },
  {
    name: "whatsapp",
    label: "Share on WhatsApp",
    href: (url, title) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    className: "bg-[#25D366] text-white",
    iconClassName: "scale-110",
    Icon: WhatsAppIcon,
  },
];
