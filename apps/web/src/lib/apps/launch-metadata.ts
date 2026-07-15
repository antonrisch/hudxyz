import { DESCRIPTION_MAX_LENGTH, truncateToMaxLength } from "@/lib/apps/copy-limits";
import { decodeUtf8Body, safeFetch, SafeFetchError } from "@/lib/apps/safe-fetch";

export type LaunchMetadata = {
  name: string | null;
  description: string | null;
  author: string | null;
  iconUrl: string | null;
  mrbdCapable: boolean;
  warnings: string[];
};

export type ParsedHtmlDocument = {
  name: string | null;
  description: string | null;
  mrbdCapable: boolean;
  manifestHref: string | null;
  iconCandidates: IconCandidate[];
};

type HtmlLink = {
  rel: string;
  href: string;
  sizes: string | null;
  type: string | null;
};

type ManifestIcon = {
  src: string;
  sizes?: string;
  type?: string;
};

type WebManifest = {
  name?: string;
  short_name?: string;
  description?: string;
  icons?: ManifestIcon[];
};

const NAME_MAX = 80;
const MIN_ICON_PX = 52;
const MANIFEST_MAX_BYTES = 256 * 1024;

type IconCandidate = {
  url: string;
  size: number;
  priority: number;
  type: string | null;
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCodePoint(n) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const n = Number.parseInt(hex, 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : _;
    });
}

function cleanText(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const trimmed = decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return truncateToMaxLength(trimmed, max);
}

function attr(tag: string, name: string): string | null {
  const double = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"));
  if (double?.[1] != null) return double[1];
  const single = tag.match(new RegExp(`\\b${name}\\s*=\\s*'([^']*)'`, "i"));
  if (single?.[1] != null) return single[1];
  const bare = tag.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, "i"));
  return bare?.[1] ?? null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return cleanText(match?.[1] ?? null, NAME_MAX);
}

function extractMetas(html: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /<meta\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const tag = match[0];
    const content = attr(tag, "content");
    if (content == null) continue;
    const name = (attr(tag, "name") ?? attr(tag, "property") ?? "").toLowerCase();
    if (!name) continue;
    out.set(name, content);
  }
  return out;
}

function extractLinks(html: string): HtmlLink[] {
  const out: HtmlLink[] = [];
  const re = /<link\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const tag = match[0];
    const rel = attr(tag, "rel");
    const href = attr(tag, "href");
    if (!rel || !href) continue;
    out.push({
      rel: rel.toLowerCase(),
      href,
      sizes: attr(tag, "sizes"),
      type: attr(tag, "type"),
    });
  }
  return out;
}

function resolveUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function parseSizePx(sizes: string | null | undefined): number {
  if (!sizes) return 0;
  if (sizes.toLowerCase() === "any") return 0;
  let best = 0;
  for (const part of sizes.split(/\s+/)) {
    const match = part.match(/^(\d+)x(\d+)$/i);
    if (!match) continue;
    const w = Number(match[1]);
    const h = Number(match[2]);
    if (!Number.isFinite(w) || !Number.isFinite(h)) continue;
    best = Math.max(best, Math.min(w, h));
  }
  return best;
}

function extensionOf(url: string): string {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const last = pathname.split("/").pop() ?? "";
    const dot = last.lastIndexOf(".");
    return dot >= 0 ? last.slice(dot + 1) : "";
  } catch {
    return "";
  }
}

function isEligibleIconUrl(url: string, type: string | null | undefined): boolean {
  const mime = (type ?? "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (mime.includes("svg") || mime === "image/x-icon" || mime === "image/vnd.microsoft.icon") {
    return false;
  }
  if (mime === "image/png" || mime === "image/jpeg" || mime === "image/webp") {
    return true;
  }

  const ext = extensionOf(url);
  if (ext === "svg" || ext === "ico") return false;
  if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp") return true;

  // No type/ext — allow and let the import step validate Content-Type.
  return !mime && !ext;
}

export function pickBestIcon(candidates: IconCandidate[]): string | null {
  const eligible = candidates.filter((c) => isEligibleIconUrl(c.url, c.type));
  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.size - a.size;
  });

  const withMin = eligible.find((c) => c.size >= MIN_ICON_PX);
  return (withMin ?? eligible[0])?.url ?? null;
}

function authorFromLaunchUrl(launchUrl: string): string | null {
  try {
    const url = new URL(launchUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/** Pure HTML parse — used by extractLaunchMetadata and unit checks. */
export function parseHtmlDocument(html: string, pageUrl: string): ParsedHtmlDocument {
  const metas = extractMetas(html);
  const links = extractLinks(html);

  const title = extractTitle(html);
  const ogTitle = cleanText(metas.get("og:title"), NAME_MAX);
  const metaDescription = cleanText(
    metas.get("description") ?? metas.get("og:description"),
    DESCRIPTION_MAX_LENGTH,
  );
  const mrbdCapable = (metas.get("mrbd-web-app-capable") ?? "").trim().toLowerCase() === "yes";

  const iconCandidates: IconCandidate[] = [];
  const manifestLink = links.find((link) => link.rel.split(/\s+/).includes("manifest"));

  for (const link of links) {
    const rels = link.rel.split(/\s+/);
    const absolute = resolveUrl(link.href, pageUrl);
    if (!absolute || !isEligibleIconUrl(absolute, link.type)) continue;

    if (rels.includes("apple-touch-icon") || rels.includes("apple-touch-icon-precomposed")) {
      iconCandidates.push({
        url: absolute,
        size: parseSizePx(link.sizes) || 180,
        priority: 2,
        type: link.type,
      });
      continue;
    }

    if (rels.includes("icon") || rels.includes("shortcut")) {
      iconCandidates.push({
        url: absolute,
        size: parseSizePx(link.sizes),
        priority: 3,
        type: link.type,
      });
    }
  }

  return {
    name: ogTitle ?? title,
    description: metaDescription,
    mrbdCapable,
    manifestHref: manifestLink ? resolveUrl(manifestLink.href, pageUrl) : null,
    iconCandidates,
  };
}

function mergeManifest(
  parsed: ParsedHtmlDocument,
  manifest: WebManifest,
  manifestUrl: string,
): ParsedHtmlDocument {
  const iconCandidates = [...parsed.iconCandidates];
  for (const icon of manifest.icons ?? []) {
    const url = resolveUrl(icon.src, manifestUrl);
    if (!url || !isEligibleIconUrl(url, icon.type)) continue;
    iconCandidates.push({
      url,
      size: parseSizePx(icon.sizes),
      priority: 1,
      type: icon.type ?? null,
    });
  }

  return {
    name: parsed.name ?? cleanText(manifest.name ?? manifest.short_name, NAME_MAX),
    description: parsed.description ?? cleanText(manifest.description, DESCRIPTION_MAX_LENGTH),
    mrbdCapable: parsed.mrbdCapable,
    manifestHref: parsed.manifestHref,
    iconCandidates,
  };
}

async function fetchManifest(
  manifestHref: string,
  warnings: string[],
): Promise<{ manifest: WebManifest; finalUrl: string } | null> {
  try {
    const result = await safeFetch(manifestHref, {
      maxBytes: MANIFEST_MAX_BYTES,
      accept: "application/manifest+json, application/json, text/json, */*",
    });
    const text = decodeUtf8Body(result.body);
    const manifest = JSON.parse(text) as WebManifest;
    return { manifest, finalUrl: result.url };
  } catch (error) {
    const message =
      error instanceof SafeFetchError ? error.message : "Could not fetch web app manifest.";
    warnings.push(message);
    return null;
  }
}

/**
 * Fetch a launch URL and extract submit-form autofill fields from HTML + optional
 * Web App Manifest (Meta MRBD metadata / icon guidance).
 */
export async function extractLaunchMetadata(launchUrl: string): Promise<LaunchMetadata> {
  const warnings: string[] = [];
  const page = await safeFetch(launchUrl, {
    maxBytes: 1_048_576,
    accept: "text/html, application/xhtml+xml, */*;q=0.8",
  });

  let parsed = parseHtmlDocument(decodeUtf8Body(page.body), page.url);

  if (parsed.manifestHref) {
    const fetched = await fetchManifest(parsed.manifestHref, warnings);
    if (fetched) {
      parsed = mergeManifest(parsed, fetched.manifest, fetched.finalUrl);
    }
  }

  const iconUrl = pickBestIcon(parsed.iconCandidates);
  if (!iconUrl) {
    warnings.push("No PNG/JPEG/WebP icon found (SVG and ICO are skipped).");
  }

  return {
    name: parsed.name,
    description: parsed.description,
    author: authorFromLaunchUrl(page.url),
    iconUrl,
    mrbdCapable: parsed.mrbdCapable,
    warnings,
  };
}
