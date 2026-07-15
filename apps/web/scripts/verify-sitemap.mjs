#!/usr/bin/env node

/**
 * Validate a live or local sitemap for HUD directory indexing rules:
 * - only canonical absolute URLs (http(s) ok for localhost checks)
 * - plausible lastmod years for every dynamic directory URL
 * - no priority/changefreq
 * - published listing paths look like /apps/{slug}/{publicId}
 * - no submit/padme/search URLs
 *
 * Usage:
 *   node scripts/verify-sitemap.mjs
 *   node scripts/verify-sitemap.mjs https://hudxyz.com/sitemap.xml
 *   node scripts/verify-sitemap.mjs http://localhost:3000/sitemap.xml
 *
 * After deploy — Google Search Console runbook:
 * 1. Sitemaps → submit/resubmit https://hudxyz.com/sitemap.xml (same URL; no version suffix)
 * 2. Confirm Success + discovered URL count matches this script
 * 3. URL Inspection → Request indexing for https://hudxyz.com/ and
 *    https://hudxyz.com/simulator (optionally /apps). Do not bulk-request
 *    every listing; let the sitemap discover the rest.
 * 4. Watch Page indexing for “Crawled/Discovered – currently not indexed”
 *    on thin category pages; enrich copy further only if Google excludes them.
 */

const DEFAULT_URL = "https://hudxyz.com/sitemap.xml";
const target = process.argv[2] ?? DEFAULT_URL;
const origin = new URL(target).origin;
const requireHttps = !origin.includes("localhost") && !origin.includes("127.0.0.1");

function isPlausibleLastmod(value) {
  if (!/^\d{4}-\d{2}-\d{2}(?:T[\d:.+-Z]+)?$/.test(value)) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const year = date.getUTCFullYear();
  if (year < 2000 || year > 2100) return false;
  // Reject absurd far-future calendar blowups from ms/seconds mixups.
  if (date.getTime() > Date.now() + 1000 * 60 * 60 * 24 * 365) return false;
  return true;
}

function extractTags(xml, tag) {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, "g");
  const out = [];
  for (const match of xml.matchAll(re)) {
    out.push(match[1]);
  }
  return out;
}

function extractUrlBlocks(xml) {
  const blocks = [];
  for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    blocks.push(match[1]);
  }
  return blocks;
}

function main() {
  return fetch(target)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${target}`);
      }
      const xml = await res.text();
      const blocks = extractUrlBlocks(xml);
      const locs = extractTags(xml, "loc");
      const lastmods = extractTags(xml, "lastmod");
      const errors = [];

      if (locs.length === 0) {
        errors.push("Sitemap has no <loc> entries");
      }
      if (/<priority>|<changefreq>/i.test(xml)) {
        errors.push("Sitemap still includes ignored priority/changefreq fields");
      }

      const seen = new Set();
      for (const loc of locs) {
        if (requireHttps && !loc.startsWith("https://")) {
          errors.push(`Non-https loc: ${loc}`);
        } else if (!loc.startsWith("http://") && !loc.startsWith("https://")) {
          errors.push(`Non-absolute loc: ${loc}`);
        }
        if (!loc.startsWith(origin)) {
          errors.push(`Off-origin loc: ${loc}`);
        }
        if (seen.has(loc)) {
          errors.push(`Duplicate loc: ${loc}`);
        }
        seen.add(loc);
        if (/\/apps\/submit(?:\/|$|\?)/.test(loc) || /\/padme(?:\/|$|\?)/.test(loc)) {
          errors.push(`Disallowed public path in sitemap: ${loc}`);
        }
        if (/[?&]q=/.test(loc)) {
          errors.push(`Search URL in sitemap: ${loc}`);
        }
      }

      for (const block of blocks) {
        const loc = extractTags(block, "loc")[0];
        const lastmod = extractTags(block, "lastmod")[0];
        if (!loc) continue;
        const isDynamicDirectory =
          /\/apps\/[^/]+\/[0-9a-z]{10}$/i.test(loc) ||
          /\/apps\/category\/[^/]+$/.test(loc) ||
          /\/apps\/collections\/[^/]+$/.test(loc);
        if (isDynamicDirectory && !lastmod) {
          errors.push(`Missing lastmod for directory URL: ${loc}`);
        }
        if (lastmod && !isPlausibleLastmod(lastmod)) {
          errors.push(`Implausible lastmod for ${loc}: ${lastmod}`);
        }
      }

      const listingLocs = locs.filter((loc) => /\/apps\/[^/]+\/[0-9a-z]{10}$/i.test(loc));
      const categoryLocs = locs.filter((loc) => /\/apps\/category\/[^/]+$/.test(loc));
      const collectionLocs = locs.filter((loc) => /\/apps\/collections\/[^/]+$/.test(loc));

      console.log(`Sitemap: ${target}`);
      console.log(`URLs: ${locs.length}`);
      console.log(`Listings: ${listingLocs.length}`);
      console.log(`Categories: ${categoryLocs.length}`);
      console.log(`Collections: ${collectionLocs.length}`);
      console.log(`lastmod values: ${lastmods.length}`);

      if (errors.length > 0) {
        console.error("\nFailures:");
        for (const error of errors) console.error(`- ${error}`);
        process.exit(1);
      }

      console.log("OK");
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}

main();
