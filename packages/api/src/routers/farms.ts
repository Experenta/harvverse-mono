import { farms, insertFarmSchema } from "@harvverse-monorepo/db/schema";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";

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
      });
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const farm = await ctx.db.query.farms.findFirst({
        where: eq(farms.id, input.id),
        with: { lots: true },
      });
      if (!farm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Farm not found" });
      }
      return farm;
    }),

  // Farmer-only (auth middleware TBD).
  create: publicProcedure
    .input(insertFarmSchema)
    .mutation(async ({ ctx, input }) => {
      const [farm] = await ctx.db.insert(farms).values(input).returning();
      if (!farm) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create farm",
        });
      }
      return farm;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        data: insertFarmSchema.partial(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [farm] = await ctx.db
        .update(farms)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(farms.id, input.id))
        .returning();

      if (!farm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Farm not found" });
      }
      return farm;
    }),
});
