import { farms, insertFarmSchema, users } from "@harvverse-monorepo/db/schema";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, publicProcedure, router } from "../index";

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
      return farm;
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
      return farm;
    }),
});
