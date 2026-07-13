"use client";

import { ImageIcon, PlusIcon, UploadIcon, XIcon } from "lucide-react";
import { useId, useRef } from "react";

import { OptionalMark } from "@/components/submit/optional-mark";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldDescription, FieldTitle } from "@/components/ui/field";
import type { AppAssetKind } from "@/db/schema";
import { MAX_SCREENSHOTS_PER_APP } from "@/lib/apps/asset-limits";
import {
  canAddScreenshot,
  createPendingItem,
  deleteAppAsset,
  type MediaItem,
  type MediaState,
  uploadAppAsset,
} from "@/lib/apps/upload-client";
import { cn } from "@/lib/utils";

type MediaUpdater = (prev: MediaState) => MediaState;
type EnsureAppId = () => Promise<string>;
type OnMediaChange = (update: MediaState | MediaUpdater) => void;

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

async function runUpload(input: {
  ensureAppId: EnsureAppId;
  kind: AppAssetKind;
  file: File;
  sortOrder: number;
  onChange: OnMediaChange;
  apiBase?: string;
}) {
  const { ensureAppId, kind, file, sortOrder, onChange, apiBase } = input;
  const pending = createPendingItem(kind, file, sortOrder);

  onChange((prev) => {
    if (kind === "icon") return { ...prev, icon: pending };
    if (kind === "video") return { ...prev, video: pending };
    return { ...prev, screenshots: [...prev.screenshots, pending] };
  });

  try {
    const appId = await ensureAppId();
    const registered = await uploadAppAsset({
      appId,
      kind,
      file,
      sortOrder,
      apiBase,
      onProgress: (progress) => {
        onChange((prev) =>
          mapItem(prev, kind, pending.localId, (item) => ({
            ...item,
            progress,
            status: "uploading",
          })),
        );
      },
    });

    onChange((prev) =>
      mapItem(prev, kind, pending.localId, (item) => ({
        ...item,
        status: "ready",
        progress: 100,
        assetId: registered.id,
        publicUrl: registered.publicUrl,
        objectKey: registered.objectKey,
        sortOrder: registered.sortOrder,
        error: undefined,
      })),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    onChange((prev) =>
      mapItem(prev, kind, pending.localId, (item) => ({
        ...item,
        status: "error",
        error: message,
      })),
    );
  }
}

/** Always takes a File[]; icon/video use length 1, screenshots may be many. */
function queueUploads(input: {
  ensureAppId: EnsureAppId;
  kind: AppAssetKind;
  files: File[];
  media: MediaState;
  onChange: OnMediaChange;
  apiBase?: string;
}) {
  const { ensureAppId, kind, files, media, onChange, apiBase } = input;
  if (files.length === 0) return;

  switch (kind) {
    case "icon":
    case "video": {
      const file = files[0];
      if (!file) return;
      void runUpload({ ensureAppId, kind, file, sortOrder: 0, onChange, apiBase });
      return;
    }
    case "screenshot": {
      const used = media.screenshots.filter((item) => item.status !== "error").length;
      const room = Math.max(0, MAX_SCREENSHOTS_PER_APP - used);
      const batch = files.slice(0, room);
      let nextOrder =
        media.screenshots.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;

      for (const file of batch) {
        void runUpload({
          ensureAppId,
          kind: "screenshot",
          file,
          sortOrder: nextOrder,
          onChange,
          apiBase,
        });
        nextOrder += 1;
      }
      return;
    }
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function removeItem(input: {
  kind: AppAssetKind;
  localId: string;
  assetId: string | undefined;
  onChange: OnMediaChange;
  apiBase?: string;
}) {
  const { kind, localId, assetId, onChange, apiBase } = input;

  onChange((prev) => {
    if (kind === "icon") return { ...prev, icon: null };
    if (kind === "video") return { ...prev, video: null };
    return {
      ...prev,
      screenshots: prev.screenshots.filter((item) => item.localId !== localId),
    };
  });

  if (assetId) {
    void deleteAppAsset(assetId, apiBase).catch(() => {
      // Best-effort; UI already dropped the item.
    });
  }
}

function attachmentState(item: MediaItem): "idle" | "uploading" | "processing" | "error" | "done" {
  switch (item.status) {
    case "uploading":
      return "uploading";
    case "ready":
      return "done";
    case "error":
      return "error";
    default:
      return "idle";
  }
}

function attachmentMeta(item: MediaItem) {
  if (item.status === "uploading") return `Uploading… ${item.progress}%`;
  if (item.status === "error") return item.error ?? "Upload failed";

  const extension = item.fileName?.split(".").pop()?.toUpperCase();
  if (item.kind === "video") return extension ? `${extension} · Video` : "MP4 · Video";
  if (item.kind === "icon") return extension ? `${extension} · Icon` : "Icon";
  return extension ? `${extension} · Image` : "Image";
}

function attachmentTitle(item: MediaItem) {
  if (item.fileName) return item.fileName;
  switch (item.kind) {
    case "icon":
      return "Icon";
    case "video":
      return "Preview video";
    case "screenshot":
      return "Screenshot";
    default: {
      const _exhaustive: never = item.kind;
      return _exhaustive;
    }
  }
}

function MediaAttachment({
  item,
  onRemove,
  disabled,
}: {
  item: MediaItem;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const title = attachmentTitle(item);
  const ready = Boolean(item.publicUrl && item.status === "ready");

  const attachment = (
    <Attachment state={attachmentState(item)} orientation="vertical">
      <AttachmentMedia variant="image">
        {ready && item.kind !== "video" ? (
          // Remote R2 URLs — next/image needs host allowlist we don't control per env.
          <img src={item.publicUrl} alt={title} />
        ) : null}
        {ready && item.kind === "video" ? (
          <video src={item.publicUrl} className="size-full object-cover" muted playsInline />
        ) : null}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{title}</AttachmentTitle>
        <AttachmentDescription>{attachmentMeta(item)}</AttachmentDescription>
      </AttachmentContent>
      {item.status !== "uploading" ? (
        <AttachmentActions>
          <AttachmentAction aria-label={`Remove ${title}`} disabled={disabled} onClick={onRemove}>
            <XIcon />
          </AttachmentAction>
        </AttachmentActions>
      ) : null}
      {ready ? (
        <DialogTrigger render={<AttachmentTrigger aria-label={`Preview ${title}`} />} />
      ) : null}
    </Attachment>
  );

  if (!ready) return attachment;

  return (
    <Dialog>
      {attachment}
      <DialogContent className="gap-0 overflow-hidden p-2 sm:max-w-2xl" showCloseButton>
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {item.kind === "video" ? (
          <video
            src={item.publicUrl}
            controls
            autoPlay
            playsInline
            className="max-h-[min(80vh,720px)] w-full rounded-xl bg-black object-contain"
          />
        ) : (
          <img
            src={item.publicUrl}
            alt={title}
            className="max-h-[min(80vh,720px)] w-full rounded-xl bg-muted object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MediaSection({
  title,
  description,
  optional,
  uploadLabel,
  accept,
  disabled,
  showUpload,
  multiple,
  onPick,
  children,
}: {
  title: string;
  description: React.ReactNode;
  optional?: boolean;
  uploadLabel: string;
  accept: string;
  disabled?: boolean;
  showUpload: boolean;
  /** Screenshots default to multi-select; a single pick is still `files.length === 1`. */
  multiple?: boolean;
  onPick: (files: File[]) => void;
  children?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <FieldTitle>
            {title}
            {optional ? <OptionalMark /> : null}
          </FieldTitle>
          <FieldDescription>{description}</FieldDescription>
        </div>
        {showUpload ? (
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <UploadIcon data-icon="inline-start" />
            {uploadLabel}
          </Button>
        ) : null}
      </div>
      {children}
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const files = event.target.files ? Array.from(event.target.files) : [];
          event.target.value = "";
          if (files.length > 0) onPick(files);
        }}
      />
    </section>
  );
}

export function SubmitIconField({
  media,
  onChange,
  ensureAppId,
  disabled,
  apiBase,
}: {
  media: MediaState;
  onChange: OnMediaChange;
  ensureAppId: EnsureAppId;
  disabled?: boolean;
  /** Defaults to `/api/apps`. Admin uses `/api/padme`. */
  apiBase?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const icon = media.icon;
  const ready = Boolean(icon?.publicUrl && icon.status === "ready");
  const uploading = icon?.status === "uploading";
  const errored = icon?.status === "error";

  function pick() {
    inputRef.current?.click();
  }

  function upload(files: File[]) {
    queueUploads({ ensureAppId, kind: "icon", files, media, onChange, apiBase });
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
        aria-label="Preview icon"
      >
        <img src={icon!.publicUrl} alt="" className="size-full object-cover" />
      </DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-2 sm:max-w-md" showCloseButton>
        <DialogTitle className="sr-only">Icon preview</DialogTitle>
        <img
          src={icon!.publicUrl}
          alt="Icon"
          className="max-h-[min(80vh,512px)] w-full rounded-xl bg-muted object-contain"
        />
      </DialogContent>
    </Dialog>
  ) : (
    <button
      type="button"
      disabled={disabled || uploading}
      onClick={pick}
      aria-label="Upload icon"
      className={cn(
        tileClassName,
        "border border-dashed border-border bg-muted/40 text-muted-foreground",
        "hover:border-foreground/30 hover:bg-muted hover:text-foreground",
        errored && "border-destructive/40 text-destructive",
        uploading && "pointer-events-none opacity-60",
      )}
    >
      {uploading ? (
        <span className="px-2 text-center text-xs tabular-nums">{icon!.progress}%</span>
      ) : (
        <PlusIcon className="size-6" strokeWidth={1.5} />
      )}
    </button>
  );

  return (
    <section className="flex items-start gap-4">
      {preview}

      <div className="min-w-0 flex-1 space-y-3 pt-0.5">
        <div className="space-y-1">
          <FieldTitle>Icon</FieldTitle>
          <FieldDescription>
            JPEG, PNG, or WebP. Best at 256×256 or larger. Max 256 KB.
          </FieldDescription>
          {errored ? <p className="text-destructive text-sm">{icon!.error}</p> : null}
        </div>

        {!uploading ? (
          ready ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={disabled} onClick={pick}>
                <ImageIcon data-icon="inline-start" />
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={disabled}
                onClick={() =>
                  removeItem({
                    kind: "icon",
                    localId: icon!.localId,
                    assetId: icon!.assetId,
                    onChange,
                    apiBase,
                  })
                }
              >
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
          const files = event.target.files ? Array.from(event.target.files) : [];
          event.target.value = "";
          if (files.length > 0) upload(files);
        }}
      />
    </section>
  );
}

export function SubmitMedia({
  media,
  onChange,
  ensureAppId,
  disabled,
  apiBase,
}: {
  media: MediaState;
  onChange: OnMediaChange;
  ensureAppId: EnsureAppId;
  disabled?: boolean;
  /** Defaults to `/api/apps`. Admin uses `/api/padme`. */
  apiBase?: string;
}) {
  function upload(kind: AppAssetKind, files: File[]) {
    queueUploads({ ensureAppId, kind, files, media, onChange, apiBase });
  }

  return (
    <div className="space-y-8">
      <MediaSection
        title="Screenshots"
        description={`Up to ${MAX_SCREENSHOTS_PER_APP}. Helps people see your Web App before they open it.`}
        optional
        uploadLabel="Upload"
        accept={IMAGE_ACCEPT}
        multiple
        showUpload={canAddScreenshot(media.screenshots)}
        disabled={disabled}
        onPick={(files) => upload("screenshot", files)}
      >
        {media.screenshots.length > 0 ? (
          <AttachmentGroup className="w-full">
            {media.screenshots.map((item) => (
              <MediaAttachment
                key={item.localId}
                item={item}
                disabled={disabled}
                onRemove={() =>
                  removeItem({
                    kind: "screenshot",
                    localId: item.localId,
                    assetId: item.assetId,
                    onChange,
                    apiBase,
                  })
                }
              />
            ))}
          </AttachmentGroup>
        ) : null}
      </MediaSection>

      <MediaSection
        title="Demo video"
        description="MP4, 5 to 30 seconds, up to 50 MB."
        optional
        uploadLabel={media.video ? "Replace" : "Upload"}
        accept="video/mp4"
        showUpload={media.video?.status !== "uploading"}
        disabled={disabled}
        onPick={(files) => upload("video", files)}
      >
        {media.video ? (
          <AttachmentGroup className="w-full">
            <MediaAttachment
              item={media.video}
              disabled={disabled}
              onRemove={() =>
                removeItem({
                  kind: "video",
                  localId: media.video!.localId,
                  assetId: media.video!.assetId,
                  onChange,
                  apiBase,
                })
              }
            />
          </AttachmentGroup>
        ) : null}
      </MediaSection>
    </div>
  );
}

function mapItem(
  media: MediaState,
  kind: AppAssetKind,
  localId: string,
  map: (item: MediaItem) => MediaItem,
): MediaState {
  if (kind === "icon" && media.icon?.localId === localId) {
    return { ...media, icon: map(media.icon) };
  }
  if (kind === "video" && media.video?.localId === localId) {
    return { ...media, video: map(media.video) };
  }
  if (kind === "screenshot") {
    return {
      ...media,
      screenshots: media.screenshots.map((item) => (item.localId === localId ? map(item) : item)),
    };
  }
  return media;
}
