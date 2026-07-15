import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { SIMULATOR_SUMMARY, SIMULATOR_TITLE } from "@/lib/simulator/config";
import { cn } from "@/lib/utils";

const HERO_IMAGE = "/home/simulator-hero.webp";
const HERO_LQIP =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAQABADASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAwEF/8QAIBAAAgICAgIDAAAAAAAAAAAAAQMCEQQSABMUMUKx0f/EABQBAQAAAAAAAAAAAAAAAAAAAAL/xAAXEQEBAQEAAAAAAAAAAAAAAAACEQAB/9oADAMBAAIRAxEAPwDLViPOT45iuMtduw3rX7yZkczHacdC4slQPYqBPv64ocxbw1k4tbdmHxAqqvjxcZFhjLr3let3QqvfGkrMQD3l3//Z";

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
      <Image
        src={HERO_IMAGE}
        alt=""
        fill
        priority
        sizes="100vw"
        placeholder="blur"
        blurDataURL={HERO_LQIP}
        className="object-cover object-center transition-transform duration-300 ease-out group-hover:scale-[1.05]"
      />
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
            "w-full pointer-events-none group-hover:bg-[color-mix(in_oklch,white_88%,black_12%)] group-active:bg-[color-mix(in_oklch,white_80%,black_20%)] sm:w-auto",
          )}
        >
          <Play fill="currentColor" data-icon="inline-start" className="size-3" />
          Launch Simulator
        </span>
      </div>
    </Link>
  );
}
