import {
  insertPartnershipSchema,
  partnershipStatusEnum,
  partnerships,
  proposals,
  users,
} from "@harvverse-monorepo/db/schema";
import { TRPCError } from "@trpc/server";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const partnershipStatusSchema = z.enum(partnershipStatusEnum.enumValues);

export const partnershipsRouter = router({
  create: protectedProcedure
    .input(insertPartnershipSchema)
    .mutation(async ({ ctx, input }) => {
      const requestingUser = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.clerkId),
      });
      if (!requestingUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }

      const proposal = await ctx.db.query.proposals.findFirst({
        where: eq(proposals.id, input.proposalId),
      });
      if (!proposal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });
      }
      if (proposal.userId !== requestingUser.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this proposal" });
      }
      if (proposal.lotId !== input.lotId || proposal.planId !== input.planId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Partnership does not match proposal" });
      }

      const [partnership] = await ctx.db
        .insert(partnerships)
        .values({ ...input, partnerUserId: requestingUser.id })
        .returning();
      if (!partnership) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create partnership",
        });
      }
      return partnership;
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const requestingUser = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.clerkId),
      });
      if (!requestingUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }
      const partnership = await ctx.db.query.partnerships.findFirst({
        where: eq(partnerships.id, input.id),
        with: {
          lot: { with: { farm: true } },
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
      if (
        partnership.partnerUserId !== requestingUser.id &&
        partnership.lot.farm.farmerId !== requestingUser.id &&
        !["admin", "settlement_operator"].includes(requestingUser.role)
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot view this partnership" });
      }
      return partnership;
    }),

  myPartnerships: protectedProcedure
    .input(
      z.object({
        clerkId: z.string().optional(),
        walletAddress: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.clerkId),
      });
      if (!user) return [];
      if (input.clerkId && input.clerkId !== ctx.clerkId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only view your own partnerships" });
      }
      if (input.walletAddress && input.walletAddress !== user.walletAddress) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only view your own partnerships" });
      }
      if (input.clerkId || !input.walletAddress) {
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

  forFarmer: protectedProcedure
    .input(
      z.object({
        clerkId: z.string().optional(),
        walletAddress: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.clerkId),
        with: { farms: { with: { lots: true } } },
      });
      if (!user) return [];
      if (input.clerkId && input.clerkId !== ctx.clerkId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only view your own farm partnerships" });
      }
      if (input.walletAddress && input.walletAddress !== user.walletAddress) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only view your own farm partnerships" });
      }
      if (input.clerkId || !input.walletAddress) {
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

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: partnershipStatusSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const requestingUser = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.clerkId),
      });
      if (!requestingUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }

      const existingPartnership = await ctx.db.query.partnerships.findFirst({
        where: eq(partnerships.id, input.id),
      });
      if (!existingPartnership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Partnership not found",
        });
      }
      if (
        existingPartnership.partnerUserId !== requestingUser.id &&
        !["admin", "settlement_operator"].includes(requestingUser.role)
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this partnership" });
      }

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
