import {
  insertLotSchema,
  lotStatusEnum,
  lots,
} from "@harvverse-monorepo/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq, type SQL } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";

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
