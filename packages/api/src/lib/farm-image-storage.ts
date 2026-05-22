import { createHash, randomUUID } from "crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@harvverse-monorepo/env/server";

type FarmImageStorageRecord = {
  data: string | null;
  storageProvider: string;
  storageBucket: string | null;
  storageKey: string | null;
  storageRegion: string | null;
  mimeType: string;
};

type StoredFarmImageObject = {
  provider: "s3";
  bucket: string;
  key: string;
  region: string;
  checksumSha256: string;
};

let s3Client: S3Client | null = null;

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function normalizeBucketName(value: string) {
  const bucketArnPrefix = "arn:aws:s3:::";
  if (value.startsWith(bucketArnPrefix)) {
    return value.slice(bucketArnPrefix.length);
  }
  return value;
}

function imageExtension(mimeType: string, filename: string) {
  const fromName = filename.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase();
  if (fromName && [".jpg", ".jpeg", ".png", ".webp"].includes(fromName)) {
    return fromName;
  }
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
}

function getS3Config() {
  const bucket = env.S3_FARM_IMAGES_BUCKET;
  const region = env.AWS_REGION;
  if (!bucket || !region) return null;

  const accessKeyId = env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;

  return {
    bucket: normalizeBucketName(bucket),
    region,
    prefix: trimSlashes(env.S3_FARM_IMAGES_PREFIX),
    ...(accessKeyId && secretAccessKey
      ? {
          accessKeyId,
          secretAccessKey,
          sessionToken: env.AWS_SESSION_TOKEN,
        }
      : {}),
  };
}

function getS3Client() {
  const config = getS3Config();
  if (!config) return null;
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.region,
      ...(config.accessKeyId && config.secretAccessKey
        ? {
            credentials: {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
              sessionToken: config.sessionToken,
            },
          }
        : {}),
    });
  }
  return s3Client;
}

export function isS3FarmImageStorageConfigured() {
  return getS3Config() != null;
}

export async function putFarmImageObject(input: {
  farmId: number;
  data: string;
  mimeType: string;
  filename: string;
}): Promise<StoredFarmImageObject | null> {
  const config = getS3Config();
  const client = getS3Client();
  if (!config || !client) return null;

  const body = Buffer.from(input.data, "base64");
  const checksumSha256 = createHash("sha256").update(body).digest("hex");
  const key = `${config.prefix}/farms/${input.farmId}/${randomUUID()}${imageExtension(
    input.mimeType,
    input.filename,
  )}`;

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: input.mimeType,
      Metadata: {
        farmId: String(input.farmId),
        checksumSha256,
      },
    }),
  );

  return {
    provider: "s3",
    bucket: config.bucket,
    key,
    region: config.region,
    checksumSha256,
  };
}

export async function deleteFarmImageObject(image: FarmImageStorageRecord) {
  if (image.storageProvider !== "s3" || !image.storageBucket || !image.storageKey) {
    return;
  }
  const client = getS3Client();
  if (!client) return;
  await client.send(
    new DeleteObjectCommand({
      Bucket: image.storageBucket,
      Key: image.storageKey,
    }),
  );
}

export async function getFarmImageUrl(image: FarmImageStorageRecord) {
  if (image.storageProvider === "s3" && image.storageBucket && image.storageKey) {
    const client = getS3Client();
    if (!client) return null;
    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: image.storageBucket,
        Key: image.storageKey,
      }),
      { expiresIn: env.S3_SIGNED_URL_TTL_SECONDS },
    );
  }

  if (image.data) {
    return `data:${image.mimeType};base64,${image.data}`;
  }

  return null;
}
