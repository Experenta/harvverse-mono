import {
  insertPartnershipSchema,
  partnershipStatusEnum,
  partnerships,
  users,
} from "@harvverse-monorepo/db/schema";
import { TRPCError } from "@trpc/server";
import { desc, eq, inArray } from "drizzle-orm";
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
    .input(
      z.object({
        clerkId: z.string().optional(),
        walletAddress: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.clerkId) {
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.clerkId, input.clerkId),
        });
        if (!user) return [];
        return ctx.db.query.partnerships.findMany({
          where: eq(partnerships.partnerUserId, user.id),
          orderBy: [desc(partnerships.createdAt)],
          with: { lot: true, plan: true },
        });
      }
      if (input.walletAddress) {
        return ctx.db.query.partnerships.findMany({
          where: eq(partnerships.partnerWallet, input.walletAddress),
          orderBy: [desc(partnerships.createdAt)],
          with: { lot: true, plan: true },
        });
      }
      return [];
    }),

  forFarmer: publicProcedure
    .input(
      z.object({
        clerkId: z.string().optional(),
        walletAddress: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.clerkId) {
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.clerkId, input.clerkId),
          with: { farms: { with: { lots: true } } },
        });
        if (!user) return [];
        const farmerLotIds = user.farms.flatMap((f) => f.lots.map((l) => l.id));
        if (farmerLotIds.length === 0) return [];
        return ctx.db.query.partnerships.findMany({
          where: inArray(partnerships.lotId, farmerLotIds),
          orderBy: [desc(partnerships.createdAt)],
          with: { lot: true, plan: true },
        });
      }
      if (input.walletAddress) {
        return ctx.db.query.partnerships.findMany({
          where: eq(partnerships.farmerWallet, input.walletAddress),
          orderBy: [desc(partnerships.createdAt)],
          with: { lot: true, plan: true },
        });
      }
      return [];
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
