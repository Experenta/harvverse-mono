import {
  insertSettlementSchema,
  settlementStatusEnum,
  settlements,
} from "@harvverse-monorepo/db/schema";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, publicProcedure, router } from "../index";

const settlementStatusSchema = z.enum(settlementStatusEnum.enumValues);

export const settlementsRouter = router({
  create: protectedProcedure
    .input(insertSettlementSchema)
    .mutation(async ({ ctx, input }) => {
      const [settlement] = await ctx.db
        .insert(settlements)
        .values(input)
        .returning();
      if (!settlement) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create settlement",
        });
      }
      return settlement;
    }),

  byPartnership: publicProcedure
    .input(z.object({ partnershipId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const settlement = await ctx.db.query.settlements.findFirst({
        where: eq(settlements.partnershipId, input.partnershipId),
        orderBy: [desc(settlements.createdAt)],
      });
      return settlement ?? null;
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: settlementStatusSchema,
        fundingTxHash: z.string().optional(),
        settlementTxHash: z.string().optional(),
        signedByWallet: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [settlement] = await ctx.db
        .update(settlements)
        .set({ ...rest, updatedAt: new Date() })
        .where(eq(settlements.id, id))
        .returning();
      if (!settlement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Settlement not found",
        });
      }
      return settlement;
    }),
});

export { settlementStatusSchema };
