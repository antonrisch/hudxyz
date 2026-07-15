#!/usr/bin/env node

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import "dotenv/config";

const accountId = process.env.R2_ACCOUNT_ID?.trim();
const bucket = process.env.R2_BUCKET;
const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");

if (!accountId || !bucket || !base) {
  console.error("Set R2_ACCOUNT_ID, R2_BUCKET, R2_PUBLIC_BASE_URL (and API keys) in .env");
  process.exit(1);
}

if (!/^[a-f0-9]{32}$/i.test(accountId)) {
  console.error(
    "R2_ACCOUNT_ID must be your Cloudflare account ID (32 hex chars), not the bucket name.",
  );
  console.error("Find it: Cloudflare dashboard → R2 → right sidebar / account overview.");
  process.exit(1);
}

const key = "smoke-test/hello.txt";
const body = "hudxyz r2 ok";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const putUrl = await getSignedUrl(
  client,
  new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: "text/plain",
  }),
  { expiresIn: 300 },
);

const putRes = await fetch(putUrl, {
  method: "PUT",
  headers: { "Content-Type": "text/plain" },
  body,
});

if (!putRes.ok) {
  console.error("PUT failed:", putRes.status, await putRes.text());
  process.exit(1);
}

const publicUrl = `${base}/${key}`;
const getRes = await fetch(publicUrl);
const text = await getRes.text();

if (!getRes.ok || text !== body) {
  console.error("GET failed:", getRes.status, text);
  process.exit(1);
}

console.log("R2 smoke test OK");
console.log("Bucket:", bucket);
console.log("Public URL:", publicUrl);
