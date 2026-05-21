import {
  insertSettlementSchema,
  partnerships,
  settlementStatusEnum,
  settlements,
  users,
} from "@harvverse-monorepo/db/schema";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const settlementStatusSchema = z.enum(settlementStatusEnum.enumValues);

export const settlementsRouter = router({
  create: protectedProcedure
    .input(insertSettlementSchema)
    .mutation(async ({ ctx, input }) => {
      const requestingUser = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.clerkId),
      });
      if (!requestingUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }

      const partnership = await ctx.db.query.partnerships.findFirst({
        where: eq(partnerships.id, input.partnershipId),
      });
      if (!partnership) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Partnership not found" });
      }
      if (
        partnership.partnerUserId !== requestingUser.id &&
        !["admin", "settlement_operator"].includes(requestingUser.role)
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this partnership" });
      }

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

  byPartnership: protectedProcedure
    .input(z.object({ partnershipId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const requestingUser = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.clerkId),
      });
      if (!requestingUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }

      const partnership = await ctx.db.query.partnerships.findFirst({
        where: eq(partnerships.id, input.partnershipId),
        with: { lot: { with: { farm: true } } },
      });
      if (!partnership) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Partnership not found" });
      }
      if (
        partnership.partnerUserId !== requestingUser.id &&
        partnership.lot.farm.farmerId !== requestingUser.id &&
        !["admin", "settlement_operator"].includes(requestingUser.role)
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot view this settlement" });
      }

      const settlement = await ctx.db.query.settlements.findFirst({
        where: eq(settlements.partnershipId, input.partnershipId),
        orderBy: [desc(settlements.createdAt)],
      });
      return settlement ?? null;
    }),

  updateStatus: protectedProcedure
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
      const requestingUser = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.clerkId),
      });
      if (!requestingUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }

      const existingSettlement = await ctx.db.query.settlements.findFirst({
        where: eq(settlements.id, id),
        with: { partnership: true },
      });
      if (!existingSettlement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Settlement not found",
        });
      }
      if (
        existingSettlement.partnership.partnerUserId !== requestingUser.id &&
        !["admin", "settlement_operator"].includes(requestingUser.role)
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this settlement" });
      }

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
