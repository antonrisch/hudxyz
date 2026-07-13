"use client";

import { useState } from "react";
import Image from "next/image";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

function slideLabel(slide: ListingMediaSlide, index: number, total: number) {
  const kind = slide.kind === "video" ? "video" : "screenshot";
  return `Preview ${kind} ${index + 1} of ${total}`;
}

/** Snap media cards to `--page-px` on the bleed carousel (mobile). */
function pageGutterAlign(): number {
  return readCssPx("--page-px");
}

function readCssPx(variable: string): number {
  if (typeof document === "undefined") return 0;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  if (raw.endsWith("rem")) {
    return parseFloat(raw) * parseFloat(getComputedStyle(document.documentElement).fontSize);
  }
  if (raw.endsWith("px")) return parseFloat(raw);
  return parseFloat(raw) || 0;
}

function SlideThumb({ slide }: { slide: ListingMediaSlide }) {
  if (slide.kind === "video") {
    return (
      <video
        src={slide.url}
        muted
        playsInline
        autoPlay
        loop
        preload="metadata"
        className="pointer-events-none aspect-4/5 w-full rounded-2xl bg-black object-fill"
      />
    );
  }

  return (
    <Image
      src={slide.url}
      alt=""
      width={slide.width ?? 864}
      height={slide.height ?? 1080}
      className="aspect-4/5 w-full rounded-2xl bg-muted object-fill"
    />
  );
}

function SlidePreview({ slide }: { slide: ListingMediaSlide }) {
  // Width-first sizing: cap width so height from 4:5 never exceeds the viewport budget.
  // Avoids fixed-height + max-w-full, which breaks the ratio and stretches on mobile.
  const previewClassName =
    "mx-auto aspect-4/5 h-auto w-full max-w-[min(100%,calc(min(80vh,720px)*4/5))] rounded-xl object-fill";

  if (slide.kind === "video") {
    return (
      <video
        src={slide.url}
        controls
        autoPlay
        playsInline
        className={cn(previewClassName, "bg-black")}
      />
    );
  }

  return (
    <Image
      src={slide.url}
      alt=""
      width={slide.width ?? 864}
      height={slide.height ?? 1080}
      className={cn(previewClassName, "bg-muted")}
    />
  );
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
  const slidesPerView = isMobile ? 1.5 : 3;
  const canScroll = slides.length > slidesPerView;
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const previewOpen = previewIndex !== null;

  if (slides.length === 0) return null;

  return (
    <>
      <Carousel
        className={cn("-mx-(--page-px) md:mx-0", className)}
        opts={{
          // Gutter lives in align (not container padding) so first + snapped slides share one inset.
          align: pageGutterAlign,
          containScroll: false,
          breakpoints: {
            "(min-width: 768px)": {
              align: "start",
              containScroll: "trimSnaps",
            },
          },
        }}
      >
        {/*
          Mobile: drop the default -ml-4/pl-4 gap model (it fights gutter align) and use gap-4.
          End padding lets the last slide snap to the gutter instead of the bleed edge.
        */}
        <CarouselContent className="ml-0 gap-4 pr-(--page-px) md:-ml-4 md:gap-0 md:pr-0">
          {slides.map((slide, index) => (
            <CarouselItem key={slide.url} className="basis-2/3 pl-0 md:basis-1/3 md:pl-4">
              <button
                type="button"
                className="w-full cursor-pointer rounded-2xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={slideLabel(slide, index, slides.length)}
                onClick={() => setPreviewIndex(index)}
              >
                <SlideThumb slide={slide} />
              </button>
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

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          if (!open) setPreviewIndex(null);
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-2 sm:max-w-2xl" showCloseButton>
          <DialogTitle className="sr-only">Media preview</DialogTitle>
          {previewIndex !== null && slides.length === 1 ? (
            <SlidePreview slide={slides[previewIndex]!} />
          ) : null}
          {previewIndex !== null && slides.length > 1 ? (
            <Carousel
              key={previewIndex}
              opts={{ startIndex: previewIndex, loop: true }}
              className="w-full"
            >
              <CarouselContent>
                {slides.map((slide) => (
                  <CarouselItem key={slide.url}>
                    <SlidePreview slide={slide} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2 border-none bg-background/80 shadow-sm" />
              <CarouselNext className="right-2 border-none bg-background/80 shadow-sm" />
            </Carousel>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
