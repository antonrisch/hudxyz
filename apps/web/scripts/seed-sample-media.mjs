#!/usr/bin/env node

/**
 * Fetches photos + a preview video from Pexels and writes them to public/sample-media/.
 * Updates src/db/seed/sample-listings.json with _source_path entries (stable local files).
 *
 * Requires PEXELS_API_KEY — https://www.pexels.com/api/
 * Run: pnpm seed:sample-media
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import "dotenv/config";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const listingsPath = join(root, "src/db/seed/sample-listings.json");
const manifestPath = join(root, "src/db/seed/sample-media-manifest.json");
const mediaRoot = join(root, "public/sample-media");

const apiKey = process.env.PEXELS_API_KEY;
if (!apiKey) {
  console.error("Missing PEXELS_API_KEY. Get one at https://www.pexels.com/api/");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const listings = JSON.parse(readFileSync(listingsPath, "utf8"));

function assetStableId(appId, kind, sortOrder) {
  const digest = createHash("sha256")
    .update(`hudxyz/sample-asset/v1/${appId}/${kind}/${sortOrder}`)
    .digest("hex");

  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `7${digest.slice(12, 15)}`,
    `8${digest.slice(16, 19)}`,
    digest.slice(20, 32),
  ].join("-");
}

async function pexelsGet(pathname, searchParams) {
  const url = new URL(pathname, "https://api.pexels.com");
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: { Authorization: apiKey },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Pexels ${pathname} failed (${response.status}): ${body}`);
  }

  return response.json();
}

async function download(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(destPath, buffer);
}

function pickPhotoSrc(photo) {
  return photo.src.large2x ?? photo.src.large ?? photo.src.original;
}

function pickVideoFile(video) {
  const mp4Files = video.video_files.filter((file) => file.file_type === "video/mp4");
  if (mp4Files.length === 0) return null;

  return mp4Files.toSorted((a, b) => Math.abs(a.width - 1280) - Math.abs(b.width - 1280))[0];
}

function extensionFromUrl(url) {
  const pathname = new URL(url).pathname;
  const ext = pathname.split(".").pop()?.toLowerCase();
  if (ext === "jpeg") return "jpg";
  if (ext && ["jpg", "png", "webp", "mp4"].includes(ext)) return ext;
  return null;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sample(items, count) {
  return shuffle(items).slice(0, count);
}

for (const entry of manifest) {
  const app = listings.apps.find((row) => row.slug === entry.slug);
  if (!app) {
    console.error(`No app with slug "${entry.slug}" in sample-listings.json`);
    process.exit(1);
  }

  const outDir = join(mediaRoot, entry.slug);
  await mkdir(outDir, { recursive: true });

  const createdAt = app.published_at ?? app.created_at;
  const newAssets = [];
  const searchPerPage = Math.min(80, Math.max(entry.screenshots * 5, 15));

  if (entry.screenshots > 0) {
    const photoPage = randomInt(1, 15);
    const { photos } = await pexelsGet("/v1/search", {
      query: entry.query,
      per_page: searchPerPage,
      page: photoPage,
      orientation: "square",
    });

    const selectedPhotos = sample(photos, entry.screenshots);

    if (selectedPhotos.length < entry.screenshots) {
      console.warn(
        `Only ${selectedPhotos.length}/${entry.screenshots} photos for "${entry.slug}" (query: ${entry.query}, page: ${photoPage})`,
      );
    }

    console.log(
      `  photos page ${photoPage} (${photos.length} results) → picked ${selectedPhotos.length}`,
    );

    for (const [index, photo] of selectedPhotos.entries()) {
      const sortOrder = index + 1;
      const src = pickPhotoSrc(photo);
      const ext = extensionFromUrl(src) ?? "jpg";
      const filename = `screenshot-${String(sortOrder).padStart(2, "0")}.${ext}`;
      const sourcePath = `public/sample-media/${entry.slug}/${filename}`;
      const destPath = join(root, sourcePath);

      await download(src, destPath);

      newAssets.push({
        id: assetStableId(app.id, "screenshot", sortOrder),
        app_id: app.id,
        kind: "screenshot",
        object_key: `apps/${app.id}/screenshots/${filename}`,
        sort_order: sortOrder,
        width: photo.width,
        height: photo.height,
        duration_ms: null,
        created_at: createdAt,
        _source_path: sourcePath,
        _pexels_id: photo.id,
        _pexels_url: photo.url,
      });

      console.log(`  photo  ${entry.slug}/${filename} (pexels:${photo.id})`);
    }
  }

  if (entry.video) {
    const videoPage = randomInt(1, 15);
    const { videos } = await pexelsGet("/videos/search", {
      query: entry.query,
      per_page: searchPerPage,
      page: videoPage,
    });

    const [video] = sample(videos, 1);
    if (!video) {
      console.warn(`No video for "${entry.slug}" (query: ${entry.query}, page: ${videoPage})`);
    } else {
      console.log(
        `  video  page ${videoPage} (${videos.length} results) → picked pexels:${video.id}`,
      );
      const file = pickVideoFile(video);
      if (!file) {
        console.warn(`No MP4 file for video ${video.id}`);
      } else {
        const durationMs = Math.round(video.duration * 1000);
        const filename = "preview.mp4";
        const sourcePath = `public/sample-media/${entry.slug}/${filename}`;
        const destPath = join(root, sourcePath);

        await download(file.link, destPath);

        newAssets.push({
          id: assetStableId(app.id, "video", 99),
          app_id: app.id,
          kind: "video",
          object_key: `apps/${app.id}/preview/${filename}`,
          sort_order: entry.screenshots + 1,
          width: file.width,
          height: file.height,
          duration_ms: durationMs,
          created_at: createdAt,
          _source_path: sourcePath,
          _pexels_id: video.id,
          _pexels_url: video.url,
        });

        console.log(`  video  ${entry.slug}/${filename} (pexels:${video.id}, ${durationMs}ms)`);
      }
    }
  }

  listings.app_assets = listings.app_assets.filter(
    (asset) => asset.app_id !== app.id || (asset.kind !== "screenshot" && asset.kind !== "video"),
  );

  const iconAssets = listings.app_assets.filter(
    (asset) => asset.app_id === app.id && asset.kind === "icon",
  );
  const otherAssets = listings.app_assets.filter((asset) => asset.app_id !== app.id);
  listings.app_assets = [...otherAssets, ...iconAssets, ...newAssets];

  console.log(`Updated ${entry.slug}: ${newAssets.length} media asset(s)`);
}

listings._comment =
  "Sample published listings. Icons: public/suggested-apps. Screenshots/video: run `pnpm seed:sample-media` (Pexels → public/sample-media/). Timestamps are Unix ms.";

writeFileSync(listingsPath, `${JSON.stringify(listings, null, 2)}\n`);
console.log(`Wrote ${listingsPath}`);
