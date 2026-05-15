import {
  insertPartnershipSchema,
  partnershipStatusEnum,
  partnerships,
} from "@harvverse-monorepo/db/schema";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";

const partnershipStatusSchema = z.enum(partnershipStatusEnum.enumValues);

export const partnershipsRouter = router({
  // Created from a signed proposal.
  create: publicProcedure
    .input(insertPartnershipSchema)
    .mutation(async ({ ctx, input }) => {
      const [partnership] = await ctx.db
        .insert(partnerships)
        .values(input)
        .returning();
      if (!partnership) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create partnership",
        });
      }
      return partnership;
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const partnership = await ctx.db.query.partnerships.findFirst({
        where: eq(partnerships.id, input.id),
        with: {
          lot: true,
          plan: true,
          evidenceRecords: true,
        },
      });
      if (!partnership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Partnership not found",
        });
      }
      return partnership;
    }),

  myPartnerships: publicProcedure
    .input(z.object({ walletAddress: z.string().trim().min(1) }))
    .query(({ ctx, input }) => {
      return ctx.db.query.partnerships.findMany({
        where: eq(partnerships.partnerWallet, input.walletAddress),
        orderBy: [desc(partnerships.createdAt)],
        with: {
          lot: true,
          plan: true,
        },
      });
    }),

  forFarmer: publicProcedure
    .input(z.object({ walletAddress: z.string().trim().min(1) }))
    .query(({ ctx, input }) => {
      return ctx.db.query.partnerships.findMany({
        where: eq(partnerships.farmerWallet, input.walletAddress),
        orderBy: [desc(partnerships.createdAt)],
        with: {
          lot: true,
          plan: true,
        },
      });
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: partnershipStatusSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [partnership] = await ctx.db
        .update(partnerships)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(partnerships.id, input.id))
        .returning();
      if (!partnership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Partnership not found",
        });
      }
      return partnership;
    }),
});

export { partnershipStatusSchema };
