import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Hard color stops — stacked bands from app/icon.svg (no blending between steps) */
export const ICON_BANDED_BACKGROUND = [
  "#00F3FE 0%",
  "#00F3FE 10%",
  "#01DCFE 10%",
  "#01DCFE 20%",
  "#01C4FF 20%",
  "#01C4FF 30%",
  "#00A6FF 30%",
  "#00A6FF 40%",
  "#0086FE 40%",
  "#0086FE 50%",
  "#0067FF 50%",
  "#0067FF 60%",
  "#0049FF 60%",
  "#0049FF 70%",
  "#012CFF 70%",
  "#012CFF 80%",
  "#0115FF 80%",
  "#0115FF 90%",
  "#0003FE 90%",
  "#0003FE 100%",
].join(", ");

export const OG_SIZE = { width: 1200, height: 630 } as const;

export async function loadArchivo(weight: 400 | 500 | 600 | 700) {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=Archivo:wght@${weight}`, {
    headers: {
      // Older UA so Google serves woff (Satori does not support woff2).
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  }).then((res) => res.text());
  const match =
    css.match(/src: url\((.+)\) format\('woff'\)/) ??
    css.match(/src: url\((.+)\) format\('truetype'\)/) ??
    css.match(/src: url\((.+)\) format\('opentype'\)/);
  if (!match) throw new Error(`Failed to load Archivo ${weight}`);
  return fetch(match[1]).then((res) => res.arrayBuffer());
}

export async function loadHudIconDataUrl(): Promise<string> {
  const icon = await readFile(join(process.cwd(), "src/app/icon.svg"));
  return `data:image/svg+xml;base64,${icon.toString("base64")}`;
}

/** Fetch a remote or site-relative image into a data URL for Satori. */
export async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    if (url.startsWith("/") && !url.startsWith("//")) {
      const filePath = join(process.cwd(), "public", url.replace(/^\//, ""));
      const buf = await readFile(filePath);
      const ext = filePath.split(".").pop()?.toLowerCase();
      const mime =
        ext === "svg"
          ? "image/svg+xml"
          : ext === "jpg" || ext === "jpeg"
            ? "image/jpeg"
            : ext === "webp"
              ? "image/webp"
              : "image/png";
      return `data:${mime};base64,${buf.toString("base64")}`;
    }

    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/png";
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
