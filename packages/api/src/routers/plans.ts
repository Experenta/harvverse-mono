import {
  insertPlanSchema,
  lots,
  planStatusEnum,
  plans,
  users,
} from "@harvverse-monorepo/db/schema";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const planStatusSchema = z.enum(planStatusEnum.enumValues);

export const plansRouter = router({
  byLotId: protectedProcedure
    .input(z.object({ lotId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const requestingUser = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.clerkId),
      });
      if (!requestingUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }
      const lot = await ctx.db.query.lots.findFirst({
        where: eq(lots.id, input.lotId),
        with: { farm: true },
      });
      if (!lot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lot not found" });
      }
      if (lot.status !== "available" && lot.farm.farmerId !== requestingUser.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot view this plan" });
      }

      const plan = await ctx.db.query.plans.findFirst({
        where: and(eq(plans.lotId, input.lotId), ne(plans.status, "revoked")),
        orderBy: [desc(plans.createdAt)],
      });
      return plan ?? null;
    }),

  create: protectedProcedure
    .input(insertPlanSchema)
    .mutation(async ({ ctx, input }) => {
      const requestingUser = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.clerkId),
      });
      if (!requestingUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }
      if (input.lotId != null) {
        const lot = await ctx.db.query.lots.findFirst({
          where: eq(lots.id, input.lotId),
          with: { farm: true },
        });
        if (!lot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Lot not found" });
        }
        if (lot.farm.farmerId !== requestingUser.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this lot" });
        }
      }

      const [plan] = await ctx.db.insert(plans).values(input).returning();
      if (!plan) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create plan",
        });
      }
      return plan;
    }),

  update: protectedProcedure
    .input(
      insertPlanSchema
        .partial()
        .extend({ id: z.number().int().positive() }),
    )
    .mutation(async ({ ctx, input }) => {
      const requestingUser = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.clerkId),
      });
      if (!requestingUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }

      const existingPlan = await ctx.db.query.plans.findFirst({
        where: eq(plans.id, input.id),
        with: { lot: { with: { farm: true } } },
      });
      if (!existingPlan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }
      if (existingPlan.lot?.farm.farmerId !== requestingUser.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this plan" });
      }

      const { id, ...values } = input;
      const [plan] = await ctx.db
        .update(plans)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(plans.id, id))
        .returning();
      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }
      return plan;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: planStatusSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const requestingUser = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.clerkId),
      });
      if (!requestingUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }

      const existingPlan = await ctx.db.query.plans.findFirst({
        where: eq(plans.id, input.id),
        with: { lot: { with: { farm: true } } },
      });
      if (!existingPlan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }
      if (
        existingPlan.lot?.farm.farmerId !== requestingUser.id &&
        !["admin", "settlement_operator"].includes(requestingUser.role)
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this plan" });
      }

      const [plan] = await ctx.db
        .update(plans)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(plans.id, input.id))
        .returning();
      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }
      return plan;
    }),
});

export { planStatusSchema };
