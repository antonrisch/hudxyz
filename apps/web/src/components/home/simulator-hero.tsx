import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";

import { Frames } from "@/components/simulator/frames";
import { buttonVariants } from "@/components/ui/button";
import { BACKGROUND_LQIP } from "@/lib/simulator/background-lqip";
import { SIMULATOR_SUMMARY, SIMULATOR_TITLE } from "@/lib/simulator/config";
import { cn } from "@/lib/utils";

export function SimulatorHero({ className }: { className?: string }) {
  return (
    <Link
      href="/simulator"
      aria-label="Launch the simulator"
      className={cn(
        "group relative block h-128 overflow-hidden rounded-2xl outline-none sm:h-96",
        "transition-transform duration-200 ease-out",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    >
      {/* Image + frames share one transform so the glasses stay locked to the photo. */}
      <div className="absolute inset-0 scale-100 transition-transform duration-300 ease-out group-hover:scale-[1.05]">
        <Image
          src="/backgrounds/alps.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          blurDataURL={BACKGROUND_LQIP.alps}
          className="object-cover object-top"
        />
        <Frames className="pointer-events-none absolute top-[40%] right-[30%] w-full origin-center -translate-y-1/2 scale-[2.25]" />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-tr from-black/80 from-5% via-black/40 via-35% to-transparent to-70% transition-opacity duration-300 ease-out group-hover:opacity-90"
      />
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-3 p-4 sm:p-6">
        <div className="max-w-2xl space-y-1.5 text-white">
          <h1 className="max-w-lg font-semibold text-2xl tracking-tight text-white sm:text-4xl">
            {SIMULATOR_TITLE}
          </h1>
          <p className="text-sm text-balance text-white/80 sm:text-md">{SIMULATOR_SUMMARY}</p>
        </div>
        <span
          className={cn(
            buttonVariants({ variant: "white", size: "lg" }),
            "w-full sm:w-auto pointer-events-none group-hover:bg-[color-mix(in_oklch,white_88%,black_12%)] group-active:bg-[color-mix(in_oklch,white_80%,black_20%)]",
          )}
        >
          <Play fill="currentColor" data-icon="inline-start" className="size-3" />
          Launch Simulator
        </span>
      </div>
    </Link>
  );
}
