"use client";

import { ImageIcon, UploadIcon, XIcon } from "lucide-react";
import { useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldDescription, FieldTitle } from "@/components/ui/field";
import type { LogoState } from "@/lib/hubs/upload-client";
import { cn } from "@/lib/utils";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export function HubLogoField({
  logo,
  disabled,
  onPick,
  onClear,
}: {
  logo: LogoState;
  disabled?: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const ready = Boolean(logo.publicUrl && logo.status === "ready");
  const uploading = logo.status === "uploading";
  const errored = logo.status === "error";

  function pick() {
    inputRef.current?.click();
  }

  const tileClassName = cn(
    "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-squircle outline-none transition-colors sm:size-24",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
    disabled && "pointer-events-none opacity-60",
  );

  const preview = ready ? (
    <Dialog>
      <DialogTrigger
        disabled={disabled}
        className={cn(tileClassName, "bg-muted hover:opacity-90")}
        aria-label="Preview logo"
      >
        {/* Remote R2 URLs — next/image needs host allowlist we don't control per env. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo.publicUrl} alt="" className="size-full object-cover" />
      </DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-2 sm:max-w-md" showCloseButton>
        <DialogTitle className="sr-only">Logo preview</DialogTitle>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo.publicUrl}
          alt="Logo"
          className="max-h-[min(80vh,512px)] w-full rounded-xl bg-muted object-contain"
        />
      </DialogContent>
    </Dialog>
  ) : (
    <button
      type="button"
      disabled={disabled || uploading}
      onClick={pick}
      aria-label="Upload logo"
      className={cn(
        tileClassName,
        "border border-dashed border-border bg-muted/40 text-muted-foreground",
        "hover:border-foreground/30 hover:bg-muted hover:text-foreground",
        errored && "border-destructive/40 text-destructive",
        uploading && "pointer-events-none opacity-60",
      )}
    >
      {uploading ? (
        <span className="px-2 text-center text-xs tabular-nums">{logo.progress}%</span>
      ) : (
        <ImageIcon className="size-12" strokeWidth={1.5} />
      )}
    </button>
  );

  return (
    <section className="flex items-start gap-4">
      {preview}

      <div className="min-w-0 flex-1 space-y-3 pt-0.5">
        <div className="space-y-1">
          <FieldTitle>Logo</FieldTitle>
          <FieldDescription>
            JPEG, PNG, or WebP. Best at 256×256 or larger. Max 256 KB.
          </FieldDescription>
          {errored ? <p className="text-destructive text-sm">{logo.error}</p> : null}
        </div>

        {!uploading ? (
          ready ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={disabled} onClick={pick}>
                <ImageIcon data-icon="inline-start" />
                Replace
              </Button>
              <Button type="button" variant="ghost" disabled={disabled} onClick={onClear}>
                <XIcon data-icon="inline-start" />
                Remove
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" disabled={disabled} onClick={pick}>
              <UploadIcon data-icon="inline-start" />
              Upload
            </Button>
          )
        ) : null}
      </div>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
    </section>
  );
}
