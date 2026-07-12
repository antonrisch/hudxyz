import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getR2Config, type R2Config } from "./env";

let client: S3Client | undefined;
let cachedConfig: R2Config | undefined;

function getConfig(): R2Config {
  if (!cachedConfig) {
    cachedConfig = getR2Config();
  }
  return cachedConfig;
}

function getR2Client(): S3Client {
  if (!client) {
    const { accountId, accessKeyId, secretAccessKey } = getConfig();
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      // Browser PUTs only send Content-Type; flexible checksums embed
      // x-amz-checksum-* on the presigned URL and break those uploads.
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
  }

  return client;
}

/** Public CDN URL for an object key (host from R2_PUBLIC_BASE_URL). */
export function publicUrl(objectKey: string): string {
  const { publicBaseUrl } = getConfig();
  const key = objectKey.replace(/^\//, "");
  return `${publicBaseUrl}/${key}`;
}

export async function presignPut(
  objectKey: string,
  contentType: string,
  expiresInSeconds = 300,
): Promise<string> {
  const { bucket } = getConfig();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: contentType,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: expiresInSeconds });
}

export async function deleteObject(objectKey: string): Promise<void> {
  const { bucket } = getConfig();
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    }),
  );
}
