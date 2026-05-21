import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    CLERK_SECRET_KEY: z.string().min(1),
    SENTINEL_HUB_CLIENT_ID: z.string().min(1).optional(),
    SENTINEL_HUB_CLIENT_SECRET: z.string().min(1).optional(),
    CDS_API_KEY: z.string().min(1).optional(),
    AWS_REGION: z.string().min(1).optional(),
    AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
    AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    AWS_SESSION_TOKEN: z.string().min(1).optional(),
    S3_FARM_IMAGES_BUCKET: z.string().min(1).optional(),
    S3_FARM_IMAGES_PREFIX: z.string().min(1).default("farm-images"),
    S3_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    CELO_SEPOLIA_RPC_URL: z.string().url().optional(),
    DEPLOYER_PRIVATE_KEY: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
