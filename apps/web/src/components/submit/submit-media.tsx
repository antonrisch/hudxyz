"use client";

import { UploadIcon, XIcon } from "lucide-react";
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

type MediaUpdater = (prev: MediaState) => MediaState;
type EnsureAppId = () => Promise<string>;
type OnMediaChange = (update: MediaState | MediaUpdater) => void;

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

async function runUpload(input: {
  ensureAppId: EnsureAppId;
  kind: AppAssetKind;
  file: File;
  media: MediaState;
  onChange: OnMediaChange;
}) {
  const { ensureAppId, kind, file, media, onChange } = input;
  const sortOrder =
    kind === "screenshot"
      ? media.screenshots.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1
      : 0;

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

function removeItem(input: {
  kind: AppAssetKind;
  localId: string;
  assetId: string | undefined;
  onChange: OnMediaChange;
}) {
  const { kind, localId, assetId, onChange } = input;

  onChange((prev) => {
    if (kind === "icon") return { ...prev, icon: null };
    if (kind === "video") return { ...prev, video: null };
    return {
      ...prev,
      screenshots: prev.screenshots.filter((item) => item.localId !== localId),
    };
  });

  if (assetId) {
    void deleteAppAsset(assetId).catch(() => {
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
  onPick: (file: File) => void;
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
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPick(file);
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
}: {
  media: MediaState;
  onChange: OnMediaChange;
  ensureAppId: EnsureAppId;
  disabled?: boolean;
}) {
  function upload(kind: AppAssetKind, file: File) {
    void runUpload({ ensureAppId, kind, file, media, onChange });
  }

  return (
    <div className="space-y-8">
      <MediaSection
        title="Icon"
        description="JPEG, PNG, or WebP. Best at 256×256 or larger. Max 256 KB."
        uploadLabel={media.icon ? "Replace" : "Upload"}
        accept={IMAGE_ACCEPT}
        showUpload={media.icon?.status !== "uploading"}
        disabled={disabled}
        onPick={(file) => upload("icon", file)}
      >
        {media.icon ? (
          <AttachmentGroup className="w-full">
            <MediaAttachment
              item={media.icon}
              disabled={disabled}
              onRemove={() =>
                removeItem({
                  kind: "icon",
                  localId: media.icon!.localId,
                  assetId: media.icon!.assetId,
                  onChange,
                })
              }
            />
          </AttachmentGroup>
        ) : null}
      </MediaSection>

      <MediaSection
        title="Screenshots"
        description={`Up to ${MAX_SCREENSHOTS_PER_APP}. Helps people see your Web App before they open it.`}
        optional
        uploadLabel="Upload"
        accept={IMAGE_ACCEPT}
        showUpload={canAddScreenshot(media.screenshots)}
        disabled={disabled}
        onPick={(file) => upload("screenshot", file)}
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
        onPick={(file) => upload("video", file)}
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
