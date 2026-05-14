import {
  insertLotSchema,
  lotStatusEnum,
  lots,
} from "@harvverse-monorepo/db/schema";
import { env } from "@harvverse-monorepo/env/server";
import { TRPCError } from "@trpc/server";
import { and, eq, type SQL } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";
import {
  computePolygonCentroid,
  computeRiskScore,
  getAltitudeFromDem,
  getAltitudeFromOpenMeteo,
  getSentinelToken,
} from "../lib/copernicus";

const lotStatusSchema = z.enum(lotStatusEnum.enumValues);

export const lotsRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          status: lotStatusSchema.optional(),
          country: z.string().trim().min(1).optional(),
          region: z.string().trim().min(1).optional(),
        })
        .optional(),
    )
    .query(({ ctx, input }) => {
      const filters: SQL[] = [];
      if (input?.status) filters.push(eq(lots.status, input.status));
      if (input?.country) filters.push(eq(lots.country, input.country));
      if (input?.region) filters.push(eq(lots.region, input.region));

      return ctx.db.query.lots.findMany({
        where: filters.length ? and(...filters) : undefined,
        with: { plans: true },
      });
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const lot = await ctx.db.query.lots.findFirst({
        where: eq(lots.id, input.id),
        with: {
          farm: true,
          plans: true,
        },
      });
      if (!lot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lot not found" });
      }
      return lot;
    }),

  byCode: publicProcedure
    .input(z.object({ code: z.string().trim().min(1) }))
    .query(async ({ ctx, input }) => {
      const lot = await ctx.db.query.lots.findFirst({
        where: eq(lots.code, input.code),
        with: {
          farm: true,
          plans: true,
        },
      });
      if (!lot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lot not found" });
      }
      return lot;
    }),

  // Farmer-only (auth middleware TBD).
  create: publicProcedure
    .input(insertLotSchema)
    .mutation(async ({ ctx, input }) => {
      const [lot] = await ctx.db.insert(lots).values(input).returning();
      if (!lot) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create lot",
        });
      }
      return lot;
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: lotStatusSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [lot] = await ctx.db
        .update(lots)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(lots.id, input.id))
        .returning();
      if (!lot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lot not found" });
      }
      return lot;
    }),

  computeRiskScore: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const lot = await ctx.db.query.lots.findFirst({
        where: eq(lots.id, input.id),
        with: { farm: true },
      });
      if (!lot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lot not found" });
      }

      const farmPolygon = lot.farm?.polygon != null
        ? (lot.farm.polygon as { coordinates: number[][][] })
        : null;

      const lat = lot.gpsLat != null ? Number(lot.gpsLat) : null;
      const lng = lot.gpsLng != null ? Number(lot.gpsLng) : null;

      let effectiveLat: number;
      let effectiveLng: number;

      if (farmPolygon) {
        const centroid = computePolygonCentroid(farmPolygon);
        effectiveLat = centroid.lat;
        effectiveLng = centroid.lng;
        if (lat === null || lng === null) {
          console.warn("[lots.computeRiskScore] No GPS coords, using polygon centroid");
        }
      } else if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        effectiveLat = lat;
        effectiveLng = lng;
        console.warn("[lots.computeRiskScore] No polygon found, using GPS point");
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Lot has no polygon or GPS coordinates — add at least one to compute a risk score.",
        });
      }

      const result = await computeRiskScore({
        lat: effectiveLat,
        lng: effectiveLng,
        eudrCompliant: lot.eudrCompliant ?? null,
        sentinelClientId: env.SENTINEL_HUB_CLIENT_ID,
        sentinelClientSecret: env.SENTINEL_HUB_CLIENT_SECRET,
        polygon: farmPolygon,
      });

      await ctx.db
        .update(lots)
        .set({
          riskScore: result.score,
          scoreHash: result.hash,
          scoreUpdatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(lots.id, input.id));

      return result;
    }),

  detectAltitude: publicProcedure
    .input(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }),
    )
    .mutation(async ({ input }) => {
      const clientId = env.SENTINEL_HUB_CLIENT_ID;
      const clientSecret = env.SENTINEL_HUB_CLIENT_SECRET;

      // Try Sentinel Hub first if credentials are configured
      if (clientId && clientSecret) {
        try {
          const token = await getSentinelToken(clientId, clientSecret);
          const altitudeMeters = await getAltitudeFromDem(token, input.lat, input.lng);
          if (altitudeMeters !== null) return { altitudeMeters };
        } catch {
          // fall through to Open-Meteo
        }
      }

      // Free fallback: Open-Meteo elevation API (Copernicus DEM GLO-90, no credentials needed)
      const altitudeMeters = await getAltitudeFromOpenMeteo(input.lat, input.lng);
      return { altitudeMeters };
    }),

  updateRiskScore: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        riskScore: z.number().int(),
        eudrCompliant: z.boolean(),
        scoreHash: z.string().trim().length(64),
        scoreUpdatedAt: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [lot] = await ctx.db
        .update(lots)
        .set({
          riskScore: input.riskScore,
          eudrCompliant: input.eudrCompliant,
          scoreHash: input.scoreHash,
          scoreUpdatedAt: input.scoreUpdatedAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(lots.id, input.id))
        .returning();
      if (!lot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lot not found" });
      }
      return lot;
    }),
});

export { lotStatusSchema };
