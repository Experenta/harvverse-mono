import type { Db } from "@harvverse-monorepo/db";
import { farmImages, farms, insertFarmSchema, users } from "@harvverse-monorepo/db/schema";
import { env } from "@harvverse-monorepo/env/server";
import { TRPCError } from "@trpc/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, publicProcedure, router } from "../index";
import {
  computePolygonCentroid,
  computeRiskScore,
  getAltitudeFromOpenMeteo,
} from "../lib/copernicus";

type FarmPolygon = { coordinates: number[][][] };
const MAX_FARM_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_FARM_IMAGES = 10;
const ALLOWED_FARM_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

type FarmImageRecord = {
  data: string;
  mimeType: string;
  isPrimary: boolean | null;
  createdAt: Date;
};

function withPrimaryImage<T extends { images?: FarmImageRecord[] }>(farm: T) {
  const primary =
    farm.images?.find((image) => image.isPrimary) ??
    farm.images?.[0] ??
    null;
  return {
    ...farm,
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
    },
    updatedAt: new Date(),
  };
}

export async function computeRiskScoreForFarm(
  farmId: number,
  db: Db,
): Promise<void> {
  const farm = await db.query.farms.findFirst({
    where: eq(farms.id, farmId),
  });
  if (!farm) return;

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

  if (lat == null || lng == null) return;

  const [result, altitude] = await Promise.all([
    computeRiskScore({
      lat,
      lng,
      eudrCompliant: farm.eudrCompliant ?? null,
      sentinelClientId: env.SENTINEL_HUB_CLIENT_ID,
      sentinelClientSecret: env.SENTINEL_HUB_CLIENT_SECRET,
      polygon,
    }),
    farm.altitudeMasl == null ? getAltitudeFromOpenMeteo(lat, lng) : null,
  ]);

  await db
    .update(farms)
    .set({
      ...farmRiskPayload(result),
      ...(altitude != null && { altitudeMasl: altitude }),
    })
    .where(eq(farms.id, farmId));
}

export const farmsRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          farmerId: z.number().int().positive().optional(),
        })
        .optional(),
    )
    .query(({ ctx, input }) => {
      const farmerId = input?.farmerId;
      return ctx.db.query.farms.findMany({
        where: farmerId ? eq(farms.farmerId, farmerId) : undefined,
        with: {
          lots: { with: { plans: true } },
          images: {
            columns: {
              data: true,
              mimeType: true,
              isPrimary: true,
              createdAt: true,
            },
            orderBy: (table, { desc }) => [desc(table.isPrimary), desc(table.createdAt)],
          },
        },
      }).then((items) => items.map(withPrimaryImage));
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
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

  listPublic: publicProcedure.query(({ ctx }) => {
    return ctx.db.query.farms.findMany({
      where: isNotNull(farms.riskScore),
      with: {
        farmer: {
          columns: {
            displayName: true,
          },
        },
        images: {
          columns: {
            data: true,
            mimeType: true,
            isPrimary: true,
            createdAt: true,
          },
          orderBy: (table, { desc }) => [desc(table.isPrimary), desc(table.createdAt)],
        },
      },
      orderBy: (table, { desc }) => [desc(table.scoreUpdatedAt)],
    }).then((items) => items.map(withPrimaryImage));
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
          images: {
            orderBy: (table, { desc }) => [desc(table.isPrimary), desc(table.createdAt)],
          },
        },
      });
      if (!farm || farm.riskScore == null) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Farm not found" });
      }
      return withPrimaryImage(farm);
    }),

  getImages: protectedProcedure
    .input(z.object({ farmId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await assertOwnsFarm(ctx.db, ctx.clerkId, input.farmId);
      return ctx.db.query.farmImages.findMany({
        where: eq(farmImages.farmId, input.farmId),
        orderBy: (table, { desc }) => [desc(table.isPrimary), desc(table.createdAt)],
      });
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

      const [image] = await ctx.db
        .insert(farmImages)
        .values({
          farmId: input.farmId,
          data: input.data,
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
    .input(insertFarmSchema)
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
      const requestingUser = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.clerkId),
      });
      if (!requestingUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }

      const farm = await ctx.db.query.farms.findFirst({
        where: eq(farms.id, input.farmId),
      });
      if (!farm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Farm not found" });
      }
      if (farm.farmerId !== requestingUser.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this farm" });
      }

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

      if (lat == null || lng == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La finca necesita un polígono o coordenadas GPS",
        });
      }

      const result = await computeRiskScore({
        lat,
        lng,
        eudrCompliant: farm.eudrCompliant ?? null,
        sentinelClientId: env.SENTINEL_HUB_CLIENT_ID,
        sentinelClientSecret: env.SENTINEL_HUB_CLIENT_SECRET,
        polygon,
      });
      const altitude =
        farm.altitudeMasl == null ? await getAltitudeFromOpenMeteo(lat, lng) : null;

      const [updatedFarm] = await ctx.db
        .update(farms)
        .set({
          ...farmRiskPayload(result),
          ...(altitude != null && { altitudeMasl: altitude }),
        })
        .where(eq(farms.id, farm.id))
        .returning();

      return updatedFarm;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        data: insertFarmSchema.partial(),
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
