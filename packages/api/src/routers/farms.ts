import { createHash } from "crypto";
import type { Db } from "@harvverse-monorepo/db";
import {
  copernicusAlerts,
  copernicusObservations,
  copernicusRuns,
  eudrAssessments,
  farmImages,
  farms,
  insertFarmSchema,
  users,
} from "@harvverse-monorepo/db/schema";
import { env } from "@harvverse-monorepo/env/server";
import { TRPCError } from "@trpc/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, publicProcedure, router } from "../index";
import {
  computePolygonCentroid,
  computeRiskScore,
} from "../lib/copernicus";
import {
  deleteFarmImageObject,
  getFarmImageUrl,
  putFarmImageObject,
} from "../lib/farm-image-storage";

type FarmPolygon = { coordinates: number[][][] };
const MAX_FARM_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_FARM_IMAGES = 10;
const ALLOWED_FARM_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const farmWritableSchema = insertFarmSchema.pick({
  name: true,
  country: true,
  region: true,
  altitudeMasl: true,
  totalArea: true,
  areaManzanas: true,
  varieties: true,
  description: true,
  certifications: true,
  latitude: true,
  longitude: true,
  polygon: true,
});

type FarmImageRecord = {
  id: number;
  data: string | null;
  storageProvider: string;
  storageBucket: string | null;
  storageKey: string | null;
  storageRegion: string | null;
  mimeType: string;
  filename: string;
  isPrimary: boolean | null;
  createdAt: Date;
};

async function withImageUrl<T extends FarmImageRecord>(image: T) {
  try {
    return {
      ...image,
      url: await getFarmImageUrl(image),
    };
  } catch (error) {
    console.error(`[farms.withImageUrl] Failed to get URL for image ${image.id}:`, error);
    return {
      ...image,
      url: null,
    };
  }
}

async function withImageUrls(images: FarmImageRecord[] | undefined) {
  return Promise.all((images ?? []).map((image) => withImageUrl(image)));
}

function publicImagePayload(image: Awaited<ReturnType<typeof withImageUrl>>) {
  return {
    id: image.id,
    url: image.url,
    data: image.data,
    mimeType: image.mimeType,
    filename: image.filename,
    isPrimary: image.isPrimary,
    createdAt: image.createdAt,
  };
}

async function withPrimaryImage<T extends { images?: FarmImageRecord[] }>(farm: T) {
  const images = await withImageUrls(farm.images);
  const primary =
    images.find((image) => image.isPrimary) ??
    images[0] ??
    null;
  return {
    ...farm,
    images,
    primaryImageUrl: primary?.url ?? null,
    primaryImageData: primary?.data ?? null,
    primaryImageMimeType: primary?.mimeType ?? null,
  };
}

async function withPublicPrimaryImage<T extends { images?: FarmImageRecord[] }>(
  farm: T,
) {
  const images = (await withImageUrls(farm.images)).map(publicImagePayload);
  const primary =
    images.find((image) => image.isPrimary) ??
    images[0] ??
    null;
  return {
    ...farm,
    images,
    primaryImageUrl: primary?.url ?? null,
    primaryImageData: primary?.data ?? null,
    primaryImageMimeType: primary?.mimeType ?? null,
  };
}

async function withPublicImages<T extends { images?: FarmImageRecord[] }>(farm: T) {
  const { images: _images, ...rest } = farm;
  const images = await withImageUrls(farm.images);
  const publicImages = images.map(publicImagePayload);
  const primary =
    publicImages.find((image) => image.isPrimary) ??
    publicImages[0] ??
    null;

  return {
    ...rest,
    images: publicImages,
    primaryImageUrl: primary?.url ?? null,
    primaryImageData: primary?.data ?? null,
    primaryImageMimeType: primary?.mimeType ?? null,
  };
}

async function getRequestingUser(ctx: { db: Db; clerkId: string | null }) {
  if (!ctx.clerkId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
  }
  const requestingUser = await ctx.db.query.users.findFirst({
    where: eq(users.clerkId, ctx.clerkId),
  });
  if (!requestingUser) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
  }
  return requestingUser;
}

async function assertOwnsFarm(db: Db, clerkId: string | null, farmId: number) {
  const requestingUser = await getRequestingUser({ db, clerkId });
  const farm = await db.query.farms.findFirst({
    where: eq(farms.id, farmId),
  });
  if (!farm) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Farm not found" });
  }
  if (farm.farmerId !== requestingUser.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this farm" });
  }
  return farm;
}

function farmRiskPayload(result: Awaited<ReturnType<typeof computeRiskScore>>) {
  const validNdvi = result.ndviMonths
    .map((month) => month.mean)
    .filter((value): value is number => typeof value === "number");
  const ndviAverage =
    validNdvi.length > 0
      ? validNdvi.reduce((sum, value) => sum + value, 0) / validNdvi.length
      : null;
  const annualPrecipMm =
    result.climateMonths.length > 0
      ? (result.climateMonths.reduce((sum, month) => sum + month.precipMm, 0) /
          result.climateMonths.length) *
        12
      : null;
  const avgTempC =
    result.climateMonths.length > 0
      ? result.climateMonths.reduce((sum, month) => sum + month.tempC, 0) /
        result.climateMonths.length
      : null;

  return {
    riskScore: result.score,
    eudrCompliant: result.eudrCompliant,
    scoreHash: result.hash,
    scoreUpdatedAt: new Date(),
    ndviAverage: ndviAverage != null ? String(ndviAverage) : null,
    annualPrecipMm: annualPrecipMm != null ? String(annualPrecipMm) : null,
    avgTempC: avgTempC != null ? String(avgTempC) : null,
    scoreBreakdown: {
      breakdown: result.breakdown,
      ndviMonths: result.ndviMonths,
      climateMonths: result.climateMonths,
      hasSentinel: result.hasSentinel,
      quarterlyNdvi: result.quarterlyNdvi,
      climateTrend: result.climateTrend,
      terrain: result.terrain,
      sentinel1: result.sentinel1,
      jrcGfc2020: result.jrcGfc2020,
      eudrScreening: result.eudrScreening,
    },
    updatedAt: new Date(),
  };
}

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function monthDate(value: string) {
  const date = new Date(`${value}-01T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function recordCopernicusEvidence(params: {
  db: Db;
  farmId: number;
  polygon: FarmPolygon | null;
  result: Awaited<ReturnType<typeof computeRiskScore>>;
}) {
  const { db, farmId, polygon, result } = params;
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - 24);

  const providerName = result.hasSentinel
    ? "sentinel_hub_cdse+open_meteo"
    : "open_meteo_fallback";
  const collectionId = result.hasSentinel
    ? "sentinel-2-l2a;open-meteo-archive"
    : "open-meteo-archive";
  const polygonHash = stableHash(polygon ?? { type: "point_or_missing" });
  const generatedReportHash = stableHash({
    farmId,
    providerName,
    collectionId,
    score: result.score,
    resultHash: result.hash,
    eudrScreening: result.eudrScreening,
  });

  const [run] = await db
    .insert(copernicusRuns)
    .values({
      farmId,
      providerName,
      providerVersion: "trustworthy-v1-stage1",
      collectionId,
      timeRangeStart: start,
      timeRangeEnd: now,
      polygonHash,
      rawResponseHash: result.hash,
      derivedMetrics: {
        score: result.score,
        breakdown: result.breakdown,
        hasSentinel: result.hasSentinel,
        ndviMonths: result.ndviMonths,
        climateMonths: result.climateMonths,
        quarterlyNdvi: result.quarterlyNdvi,
        climateTrend: result.climateTrend,
        terrain: result.terrain,
        sentinel1: result.sentinel1,
        jrcGfc2020: result.jrcGfc2020,
      },
      confidence: result.eudrScreening.confidence,
      generatedReportHash,
      status: "complete",
    })
    .returning();

  if (!run) return null;

  const observationRows = [
    ...result.ndviMonths.map((month) => ({
      runId: run.id,
      farmId,
      providerName: "sentinel_hub_cdse",
      collectionId: "sentinel-2-l2a",
      observedAt: monthDate(month.date),
      metricType: "ndvi_monthly",
      metrics: month,
      confidence: month.mean == null ? "low" : "medium",
    })),
    ...result.climateMonths.map((month) => ({
      runId: run.id,
      farmId,
      providerName: "open_meteo",
      collectionId: "open-meteo-archive",
      observedAt: monthDate(month.date),
      metricType: "climate_monthly",
      metrics: month,
      confidence: "medium",
    })),
    ...result.quarterlyNdvi.map((quarter) => ({
      runId: run.id,
      farmId,
      providerName: "sentinel_hub_cdse",
      collectionId: "sentinel-2-l2a",
      observedAt: null,
      metricType: "ndvi_quarterly",
      metrics: quarter,
      confidence: quarter.mean == null ? "low" : "medium",
    })),
    {
      runId: run.id,
      farmId,
      providerName: result.climateTrend.provider,
      collectionId: "open-meteo-archive",
      observedAt: null,
      metricType: "climate_trend",
      metrics: result.climateTrend,
      confidence: result.climateTrend.confidence,
    },
    {
      runId: run.id,
      farmId,
      providerName: result.terrain.provider,
      collectionId: result.terrain.provider,
      observedAt: null,
      metricType: "terrain",
      metrics: result.terrain,
      confidence: result.terrain.confidence,
    },
    {
      runId: run.id,
      farmId,
      providerName: result.sentinel1.provider,
      collectionId: "sentinel-1-grd",
      observedAt: null,
      metricType: "sentinel1_readiness",
      metrics: result.sentinel1,
      confidence: result.sentinel1.confidence,
    },
    {
      runId: run.id,
      farmId,
      providerName: result.jrcGfc2020.provider,
      collectionId: "jrc-gfc2020",
      observedAt: null,
      metricType: "jrc_gfc2020_readiness",
      metrics: result.jrcGfc2020,
      confidence: result.jrcGfc2020.confidence,
    },
  ];

  if (observationRows.length > 0) {
    await db.insert(copernicusObservations).values(observationRows);
  }

  const assessmentHash = stableHash({
    farmId,
    runId: run.id,
    eudrScreening: result.eudrScreening,
  });
  const [assessment] = await db.insert(eudrAssessments).values({
    farmId,
    runId: run.id,
    status: result.eudrScreening.status,
    score: result.eudrScreening.score,
    confidence: result.eudrScreening.confidence,
    source: result.eudrScreening.source,
    cutoffDate: result.eudrScreening.cutoffDate,
    reasons: result.eudrScreening.reasons,
    limitations: result.eudrScreening.limitations,
    assessmentHash,
  }).returning();

  let alert: typeof copernicusAlerts.$inferSelect | null = null;

  if (
    result.eudrScreening.status === "review_required" ||
    result.eudrScreening.status === "high_risk" ||
    result.eudrScreening.status === "unknown"
  ) {
    const alertPayload = {
      runId: run.id,
      severity: result.eudrScreening.status === "high_risk" ? "high" : "medium",
      message: result.eudrScreening.reasons[0] ?? "EUDR screening requires review.",
      metrics: {
        status: result.eudrScreening.status,
        score: result.eudrScreening.score,
        confidence: result.eudrScreening.confidence,
      },
    };
    const existingOpenAlert = await db.query.copernicusAlerts.findFirst({
      where: and(
        eq(copernicusAlerts.farmId, farmId),
        eq(copernicusAlerts.type, "eudr_review_trigger"),
        eq(copernicusAlerts.status, "open"),
      ),
    });

    if (existingOpenAlert) {
      const [updatedAlert] = await db
        .update(copernicusAlerts)
        .set(alertPayload)
        .where(eq(copernicusAlerts.id, existingOpenAlert.id))
        .returning();
      alert = updatedAlert ?? null;
    } else {
      const [createdAlert] = await db
        .insert(copernicusAlerts)
        .values({
          farmId,
          type: "eudr_review_trigger",
          ...alertPayload,
        })
        .returning();
      alert = createdAlert ?? null;
    }
  }

  return { run, assessment: assessment ?? null, alert };
}

async function runCopernicusAnalysisForFarm(
  farmId: number,
  db: Db,
): Promise<{
  farm: typeof farms.$inferSelect;
  run: typeof copernicusRuns.$inferSelect | null;
  eudrAssessment: typeof eudrAssessments.$inferSelect | null;
  alert: typeof copernicusAlerts.$inferSelect | null;
  generatedReportHash: string | null;
} | null> {
  const farm = await db.query.farms.findFirst({
    where: eq(farms.id, farmId),
  });
  if (!farm) return null;

  const polygon =
    farm.polygon != null ? (farm.polygon as FarmPolygon) : null;
  const centroid = polygon ? computePolygonCentroid(polygon) : null;
  const lat =
    centroid?.lat ??
    (farm.latitude != null && !Number.isNaN(Number(farm.latitude))
      ? Number(farm.latitude)
      : null);
  const lng =
    centroid?.lng ??
    (farm.longitude != null && !Number.isNaN(Number(farm.longitude))
      ? Number(farm.longitude)
      : null);

  if (lat == null || lng == null) return null;

  const result = await computeRiskScore({
    lat,
    lng,
    eudrCompliant: farm.eudrCompliant ?? null,
    sentinelClientId: env.SENTINEL_HUB_CLIENT_ID,
    sentinelClientSecret: env.SENTINEL_HUB_CLIENT_SECRET,
    polygon,
  });
  const altitude =
    farm.altitudeMasl == null ? result.terrain.elevationMasl : null;

  const [updatedFarm] = await db
    .update(farms)
    .set({
      ...farmRiskPayload(result),
      ...(altitude != null && { altitudeMasl: altitude }),
    })
    .where(eq(farms.id, farmId))
    .returning();

  const evidence = await recordCopernicusEvidence({ db, farmId, polygon, result });

  if (!updatedFarm) return null;

  return {
    farm: updatedFarm,
    run: evidence?.run ?? null,
    eudrAssessment: evidence?.assessment ?? null,
    alert: evidence?.alert ?? null,
    generatedReportHash: evidence?.run.generatedReportHash ?? null,
  };
}

export async function computeRiskScoreForFarm(
  farmId: number,
  db: Db,
): Promise<typeof farms.$inferSelect | null> {
  const analysis = await runCopernicusAnalysisForFarm(farmId, db);
  return analysis?.farm ?? null;
}

export const farmsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          farmerId: z.number().int().positive().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const requestingUser = await getRequestingUser(ctx);
      const farmerId = input?.farmerId ?? requestingUser.id;
      if (farmerId !== requestingUser.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only list your own farms",
        });
      }

      const items = await ctx.db.query.farms.findMany({
        where: farmerId ? eq(farms.farmerId, farmerId) : undefined,
        with: {
          lots: { with: { plans: true } },
          images: {
            columns: {
              id: true,
              data: true,
              storageProvider: true,
              storageBucket: true,
              storageKey: true,
              storageRegion: true,
              mimeType: true,
              filename: true,
              isPrimary: true,
              createdAt: true,
            },
            orderBy: (table, { desc }) => [desc(table.isPrimary), desc(table.createdAt)],
          },
        },
      });
      return Promise.all(items.map(withPrimaryImage));
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await assertOwnsFarm(ctx.db, ctx.clerkId, input.id);
      const farm = await ctx.db.query.farms.findFirst({
        where: eq(farms.id, input.id),
        with: {
          lots: { with: { plans: true } },
          images: {
            orderBy: (table, { desc }) => [desc(table.isPrimary), desc(table.createdAt)],
          },
        },
      });
      if (!farm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Farm not found" });
      }
      return withPrimaryImage(farm);
    }),

  listPublic: publicProcedure.query(async ({ ctx }) => {
    const items = await ctx.db.query.farms.findMany({
      where: isNotNull(farms.riskScore),
      with: {
        farmer: {
          columns: {
            displayName: true,
          },
        },
        lots: {
          with: { plans: true },
        },
        images: {
          columns: {
            id: true,
            data: true,
            storageProvider: true,
            storageBucket: true,
            storageKey: true,
            storageRegion: true,
            mimeType: true,
            filename: true,
            isPrimary: true,
            createdAt: true,
          },
          orderBy: (table, { desc }) => [desc(table.isPrimary), desc(table.createdAt)],
        },
      },
      orderBy: (table, { desc }) => [desc(table.scoreUpdatedAt)],
    });
    return Promise.all(items.map(withPublicPrimaryImage));
  }),

  byIdPublic: publicProcedure
    .input(z.object({ farmId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const farm = await ctx.db.query.farms.findFirst({
        where: eq(farms.id, input.farmId),
        with: {
          farmer: {
            columns: {
              displayName: true,
            },
          },
          lots: { with: { plans: true } },
          images: {
            orderBy: (table, { desc }) => [desc(table.isPrimary), desc(table.createdAt)],
          },
        },
      });
      if (!farm || farm.riskScore == null) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Farm not found" });
      }
      return withPublicImages(farm);
    }),

  getImages: protectedProcedure
    .input(z.object({ farmId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await assertOwnsFarm(ctx.db, ctx.clerkId, input.farmId);
      const images = await ctx.db.query.farmImages.findMany({
        where: eq(farmImages.farmId, input.farmId),
        orderBy: (table, { desc }) => [desc(table.isPrimary), desc(table.createdAt)],
      });
      return Promise.all(images.map(withImageUrl));
    }),

  uploadImage: protectedProcedure
    .input(
      z.object({
        farmId: z.number().int().positive(),
        data: z.string().min(1),
        mimeType: z.enum(ALLOWED_FARM_IMAGE_TYPES),
        filename: z.string().min(1).max(255),
        sizeBytes: z.number().int().positive().max(MAX_FARM_IMAGE_BYTES),
        isPrimary: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnsFarm(ctx.db, ctx.clerkId, input.farmId);

      const existingImages = await ctx.db.query.farmImages.findMany({
        where: eq(farmImages.farmId, input.farmId),
        columns: { id: true },
      });
      if (existingImages.length >= MAX_FARM_IMAGES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Maximum 10 images per farm",
        });
      }

      const shouldBePrimary = input.isPrimary || existingImages.length === 0;
      if (shouldBePrimary) {
        await ctx.db
          .update(farmImages)
          .set({ isPrimary: false })
          .where(eq(farmImages.farmId, input.farmId));
      }

      const storedObject = await putFarmImageObject({
        farmId: input.farmId,
        data: input.data,
        mimeType: input.mimeType,
        filename: input.filename,
      }).catch((error) => {
        console.error("[farms.uploadImage] S3 upload failed, falling back to database storage:", error);
        return null;
      });
      const fallbackChecksum = storedObject
        ? null
        : createHash("sha256").update(Buffer.from(input.data, "base64")).digest("hex");

      const [image] = await ctx.db
        .insert(farmImages)
        .values({
          farmId: input.farmId,
          data: storedObject ? null : input.data,
          storageProvider: storedObject?.provider ?? "database",
          storageBucket: storedObject?.bucket ?? null,
          storageKey: storedObject?.key ?? null,
          storageRegion: storedObject?.region ?? null,
          checksumSha256: storedObject?.checksumSha256 ?? fallbackChecksum,
          mimeType: input.mimeType,
          filename: input.filename,
          sizeBytes: input.sizeBytes,
          isPrimary: shouldBePrimary,
        })
        .returning({
          id: farmImages.id,
          farmId: farmImages.farmId,
          isPrimary: farmImages.isPrimary,
          filename: farmImages.filename,
        });

      return image;
    }),

  deleteImage: protectedProcedure
    .input(z.object({ imageId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const image = await ctx.db.query.farmImages.findFirst({
        where: eq(farmImages.id, input.imageId),
        with: { farm: true },
      });
      if (!image) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Image not found" });
      }
      await assertOwnsFarm(ctx.db, ctx.clerkId, image.farmId);

      await deleteFarmImageObject(image);
      await ctx.db.delete(farmImages).where(eq(farmImages.id, input.imageId));

      if (image.isPrimary) {
        const nextImage = await ctx.db.query.farmImages.findFirst({
          where: eq(farmImages.farmId, image.farmId),
          orderBy: (table, { desc }) => [desc(table.createdAt)],
        });
        if (nextImage) {
          await ctx.db
            .update(farmImages)
            .set({ isPrimary: true })
            .where(eq(farmImages.id, nextImage.id));
        }
      }

      return { success: true };
    }),

  setPrimaryImage: protectedProcedure
    .input(z.object({ imageId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const image = await ctx.db.query.farmImages.findFirst({
        where: eq(farmImages.id, input.imageId),
      });
      if (!image) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Image not found" });
      }
      await assertOwnsFarm(ctx.db, ctx.clerkId, image.farmId);
      await ctx.db
        .update(farmImages)
        .set({ isPrimary: false })
        .where(eq(farmImages.farmId, image.farmId));
      await ctx.db
        .update(farmImages)
        .set({ isPrimary: true })
        .where(and(eq(farmImages.id, image.id), eq(farmImages.farmId, image.farmId)));

      return { success: true };
    }),

  create: protectedProcedure
    .input(farmWritableSchema)
    .mutation(async ({ ctx, input }) => {
      const requestingUser = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.clerkId),
      });
      if (!requestingUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }
      const [farm] = await ctx.db
        .insert(farms)
        .values({ ...input, farmerId: requestingUser.id })
        .returning();
      if (!farm) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create farm",
        });
      }
      if (farm.latitude != null || farm.polygon != null) {
        computeRiskScoreForFarm(farm.id, ctx.db).catch((err) =>
          console.error("[farms.computeRiskScoreForFarm]", err),
        );
      }
      return farm;
    }),

  computeRiskScore: protectedProcedure
    .input(z.object({ farmId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnsFarm(ctx.db, ctx.clerkId, input.farmId);
      const updatedFarm = await computeRiskScoreForFarm(input.farmId, ctx.db);
      if (!updatedFarm) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La finca necesita un polígono o coordenadas GPS",
        });
      }
      return updatedFarm;
    }),

  runCopernicusAnalysis: protectedProcedure
    .input(z.object({ farmId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnsFarm(ctx.db, ctx.clerkId, input.farmId);
      const analysis = await runCopernicusAnalysisForFarm(input.farmId, ctx.db);
      if (!analysis) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La finca necesita un polígono o coordenadas GPS",
        });
      }
      return analysis;
    }),

  copernicusHistory: protectedProcedure
    .input(z.object({ farmId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await assertOwnsFarm(ctx.db, ctx.clerkId, input.farmId);
      return ctx.db.query.copernicusRuns.findMany({
        where: eq(copernicusRuns.farmId, input.farmId),
        with: {
          observations: true,
          eudrAssessments: true,
          alerts: true,
        },
        orderBy: (table, { desc }) => [desc(table.createdAt)],
        limit: 10,
      });
    }),

  eudrAssessment: protectedProcedure
    .input(z.object({ farmId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await assertOwnsFarm(ctx.db, ctx.clerkId, input.farmId);
      return ctx.db.query.eudrAssessments.findFirst({
        where: eq(eudrAssessments.farmId, input.farmId),
        with: {
          run: true,
        },
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        data: farmWritableSchema.partial(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const requestingUser = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.clerkId),
      });
      if (!requestingUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }

      const existing = await ctx.db.query.farms.findFirst({
        where: eq(farms.id, input.id),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Farm not found" });
      }
      if (existing.farmerId !== requestingUser.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this farm" });
      }

      const [farm] = await ctx.db
        .update(farms)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(farms.id, input.id))
        .returning();

      if (!farm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Farm not found" });
      }
      if (
        input.data.polygon !== undefined ||
        input.data.latitude !== undefined ||
        input.data.longitude !== undefined
      ) {
        computeRiskScoreForFarm(farm.id, ctx.db).catch((err) =>
          console.error("[farms.computeRiskScoreForFarm:update]", err),
        );
      }
      return farm;
    }),
});
