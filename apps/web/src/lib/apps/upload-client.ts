import type { AppAssetKind } from "@/db/schema";
import { parseApiError } from "@/lib/apps/api-error";
import {
  isAllowedContentTypeForKind,
  maxBytesForAssetKind,
  MAX_SCREENSHOTS_PER_APP,
} from "@/lib/apps/asset-limits";

export type UploadStatus = "idle" | "uploading" | "ready" | "error";

export type MediaItem = {
  localId: string;
  kind: AppAssetKind;
  status: UploadStatus;
  progress: number;
  error?: string;
  assetId?: string;
  publicUrl?: string;
  objectKey?: string;
  fileName?: string;
  sortOrder: number;
};

export type MediaState = {
  icon: MediaItem | null;
  screenshots: MediaItem[];
  video: MediaItem | null;
};

export function emptyMediaState(): MediaState {
  return { icon: null, screenshots: [], video: null };
}

export function mediaFromAssets(
  assets: {
    id: string;
    kind: AppAssetKind;
    publicUrl: string;
    objectKey: string;
    sortOrder: number;
  }[],
): MediaState {
  const next = emptyMediaState();
  for (const asset of assets) {
    const item: MediaItem = {
      localId: asset.id,
      kind: asset.kind,
      status: "ready",
      progress: 100,
      assetId: asset.id,
      publicUrl: asset.publicUrl,
      objectKey: asset.objectKey,
      sortOrder: asset.sortOrder,
    };
    switch (asset.kind) {
      case "icon":
        next.icon = item;
        break;
      case "video":
        next.video = item;
        break;
      case "screenshot":
        next.screenshots.push(item);
        break;
      default: {
        const _exhaustive: never = asset.kind;
        void _exhaustive;
      }
    }
  }
  next.screenshots.sort((a, b) => a.sortOrder - b.sortOrder);
  return next;
}

function newLocalId() {
  return crypto.randomUUID();
}

export function validateClientFile(kind: AppAssetKind, file: File): string | null {
  if (!isAllowedContentTypeForKind(kind, file.type)) {
    return kind === "video"
      ? "Preview must be an MP4 video."
      : "Images must be JPEG, PNG, or WebP.";
  }
  const maxBytes = maxBytesForAssetKind(kind);
  if (file.size > maxBytes) {
    switch (kind) {
      case "icon":
        return "Icon must be 256 KB or smaller.";
      case "screenshot":
        return "Screenshot must be 5 MB or smaller.";
      case "video":
        return "Video must be 50 MB or smaller.";
      default: {
        const _exhaustive: never = kind;
        return _exhaustive;
      }
    }
  }
  return null;
}

async function readImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const dims = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dims;
  } catch {
    return {};
  }
}

async function readVideoMeta(file: File): Promise<{
  width?: number;
  height?: number;
  durationMs?: number;
}> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const durationMs = Number.isFinite(video.duration)
        ? Math.round(video.duration * 1000)
        : undefined;
      resolve({
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
        durationMs,
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    video.src = url;
  });
}

type PresignResponse = {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
};

type RegisterResponse = {
  id: string;
  kind: AppAssetKind;
  objectKey: string;
  publicUrl: string;
  sortOrder: number;
};

export async function uploadAppAsset(input: {
  appId: string;
  kind: AppAssetKind;
  file: File;
  sortOrder?: number;
  onProgress?: (progress: number) => void;
}): Promise<RegisterResponse> {
  const { appId, kind, file, sortOrder, onProgress } = input;

  const validationError = validateClientFile(kind, file);
  if (validationError) {
    throw new Error(validationError);
  }

  const meta = kind === "video" ? await readVideoMeta(file) : await readImageDimensions(file);

  const presignRes = await fetch("/api/apps/assets/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appId,
      kind,
      filename: file.name,
      contentType: file.type,
    }),
  });
  if (!presignRes.ok) {
    throw new Error(await parseApiError(presignRes));
  }
  const presign = (await presignRes.json()) as PresignResponse;

  onProgress?.(10);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presign.uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const pct = 10 + Math.round((event.loaded / event.total) * 80);
      onProgress?.(pct);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });

  onProgress?.(95);

  const registerRes = await fetch("/api/apps/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appId,
      kind,
      objectKey: presign.objectKey,
      sortOrder,
      width: meta.width,
      height: meta.height,
      durationMs: "durationMs" in meta ? meta.durationMs : undefined,
    }),
  });
  if (!registerRes.ok) {
    throw new Error(await parseApiError(registerRes));
  }

  onProgress?.(100);
  return (await registerRes.json()) as RegisterResponse;
}

export async function deleteAppAsset(assetId: string) {
  const response = await fetch(`/api/apps/assets/${assetId}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}

export function canAddScreenshot(screenshots: MediaItem[]) {
  return screenshots.filter((item) => item.status !== "error").length < MAX_SCREENSHOTS_PER_APP;
}

export function createPendingItem(kind: AppAssetKind, file: File, sortOrder: number): MediaItem {
  return {
    localId: newLocalId(),
    kind,
    status: "uploading",
    progress: 0,
    fileName: file.name,
    sortOrder,
  };
}
