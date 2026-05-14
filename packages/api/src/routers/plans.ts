import {
  insertPlanSchema,
  planStatusEnum,
  plans,
} from "@harvverse-monorepo/db/schema";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";

const planStatusSchema = z.enum(planStatusEnum.enumValues);

export const plansRouter = router({
  byLotId: publicProcedure
    .input(z.object({ lotId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const plan = await ctx.db.query.plans.findFirst({
        where: and(eq(plans.lotId, input.lotId), ne(plans.status, "revoked")),
        orderBy: [desc(plans.createdAt)],
      });
      return plan ?? null;
    }),

  create: publicProcedure
    .input(insertPlanSchema)
    .mutation(async ({ ctx, input }) => {
      const [plan] = await ctx.db.insert(plans).values(input).returning();
      if (!plan) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create plan",
        });
      }
      return plan;
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: planStatusSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
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
