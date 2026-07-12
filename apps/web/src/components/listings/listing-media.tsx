"use client";

import Image from "next/image";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { ListingMediaImage, ListingMediaVideo } from "@/lib/apps/queries";
import { useMobileLayout } from "@/lib/use-mobile-layout";
import { cn } from "@/lib/utils";

type ListingMediaSlide =
  | ({ kind: "video" } & ListingMediaVideo)
  | ({ kind: "image" } & ListingMediaImage);

function buildSlides(
  video: ListingMediaVideo | null,
  screenshots: ListingMediaImage[],
): ListingMediaSlide[] {
  const slides: ListingMediaSlide[] = [];
  if (video) slides.push({ kind: "video", ...video });
  for (const shot of screenshots) {
    slides.push({ kind: "image", ...shot });
  }
  return slides;
}

export function ListingMedia({
  screenshots,
  video,
  className,
}: {
  screenshots: ListingMediaImage[];
  video: ListingMediaVideo | null;
  className?: string;
}) {
  const slides = buildSlides(video, screenshots);
  const isMobile = useMobileLayout();
  const slidesPerView = isMobile ? 1 : 3;
  const canScroll = slides.length > slidesPerView;

  if (slides.length === 0) return null;

  return (
    <Carousel className={cn("w-full", className)} opts={{ align: "start" }}>
      <CarouselContent>
        {slides.map((slide) => (
          <CarouselItem key={slide.url} className="basis-full md:basis-1/3">
            {slide.kind === "video" ? (
              <video
                src={slide.url}
                controls
                playsInline
                autoPlay
                loop
                preload="metadata"
                className="h-120 w-full rounded-2xl bg-black object-contain"
              />
            ) : (
              <Image
                src={slide.url}
                alt=""
                width={slide.width ?? 600}
                height={slide.height ?? 600}
                className="h-120 w-full rounded-2xl bg-muted object-cover"
              />
            )}
          </CarouselItem>
        ))}
      </CarouselContent>
      {canScroll ? (
        <>
          <CarouselPrevious className="left-2 border-none bg-background/80 shadow-sm" />
          <CarouselNext className="right-2 border-none bg-background/80 shadow-sm" />
        </>
      ) : null}
    </Carousel>
  );
}
