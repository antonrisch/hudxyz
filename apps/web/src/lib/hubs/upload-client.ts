import { parseApiError } from "@/lib/hubs/api-error";
import {
  isAllowedLogoContentType,
  MAX_LOGO_BYTES,
  sanitizeLogoFilename,
} from "@/lib/hubs/logo-limits";

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function uploadLogoFilename(file: File): string {
  const fallbackExt = EXT_BY_CONTENT_TYPE[file.type] ?? "bin";
  const sanitized = sanitizeLogoFilename(file.name) ?? `logo.${fallbackExt}`;
  const id = crypto.randomUUID().slice(0, 8);
  const lastDot = sanitized.lastIndexOf(".");
  if (lastDot > 0) {
    return `${sanitized.slice(0, lastDot)}-${id}${sanitized.slice(lastDot)}`;
  }
  return `${sanitized}-${id}.${fallbackExt}`;
}

export type LogoState = {
  status: "idle" | "uploading" | "ready" | "error";
  progress: number;
  error?: string;
  publicUrl?: string;
  objectKey?: string;
  fileName?: string;
};

export function emptyLogoState(): LogoState {
  return { status: "idle", progress: 0 };
}

export function logoFromUrl(
  logoUrl: string | null | undefined,
  objectKey?: string | null,
): LogoState {
  if (!logoUrl) return emptyLogoState();
  return {
    status: "ready",
    progress: 100,
    publicUrl: logoUrl,
    objectKey: objectKey ?? undefined,
  };
}

export function validateLogoFile(file: File): string | null {
  if (!isAllowedLogoContentType(file.type)) {
    return "Logo must be JPEG, PNG, or WebP.";
  }
  if (file.size > MAX_LOGO_BYTES) {
    return "Logo must be 256 KB or smaller.";
  }
  return null;
}

function putWithProgress(
  uploadUrl: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}

export async function uploadHubLogo(options: {
  hubId: string;
  file: File;
  onProgress?: (pct: number) => void;
  apiBase?: string;
}): Promise<{ publicUrl: string; objectKey: string }> {
  const { hubId, file, onProgress, apiBase = "/api/hubs" } = options;
  const validationError = validateLogoFile(file);
  if (validationError) throw new Error(validationError);

  const filename = uploadLogoFilename(file);

  const presignRes = await fetch(`${apiBase}/logo/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hubId,
      filename,
      contentType: file.type,
    }),
  });
  if (!presignRes.ok) throw new Error(await parseApiError(presignRes));
  const { uploadUrl, objectKey } = (await presignRes.json()) as {
    uploadUrl: string;
    objectKey: string;
  };

  await putWithProgress(uploadUrl, file, onProgress);

  const registerRes = await fetch(`${apiBase}/logo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hubId, objectKey }),
  });
  if (!registerRes.ok) throw new Error(await parseApiError(registerRes));
  const registered = (await registerRes.json()) as { logoUrl: string; logoObjectKey: string };
  return { publicUrl: registered.logoUrl, objectKey: registered.logoObjectKey };
}

export async function deleteHubLogo(hubId: string, apiBase = "/api/hubs"): Promise<void> {
  const response = await fetch(`${apiBase}/logo?hubId=${encodeURIComponent(hubId)}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 204) {
    throw new Error(await parseApiError(response));
  }
}
