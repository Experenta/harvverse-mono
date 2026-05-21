import {
  insertProposalSchema,
  lots,
  proposalStatusEnum,
  proposals,
  users,
} from "@harvverse-monorepo/db/schema";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const proposalStatusSchema = z.enum(proposalStatusEnum.enumValues);
const proposalCreateSchema = insertProposalSchema
  .omit({ userId: true })
  .extend({ expiresAt: z.coerce.date() })
  .extend({ walletAddress: z.string().optional().default("") });

export const proposalsRouter = router({
  create: protectedProcedure
    .input(proposalCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const requestingUser = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.clerkId),
      });
      if (!requestingUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }

      const [proposal] = await ctx.db
        .insert(proposals)
        .values({
          ...input,
          userId: requestingUser.id,
          walletAddress: input.walletAddress ?? "",
        })
        .returning();
      if (!proposal) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create proposal",
        });
      }
      return proposal;
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
      const proposal = await ctx.db.query.proposals.findFirst({
        where: eq(proposals.id, input.id),
        with: {
          lot: { with: { farm: true } },
          plan: true,
        },
      });
      if (!proposal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Proposal not found",
        });
      }
      if (
        proposal.userId !== requestingUser.id &&
        proposal.lot.farm.farmerId !== requestingUser.id &&
        !["admin", "settlement_operator"].includes(requestingUser.role)
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot view this proposal" });
      }
      return proposal;
    }),

  myProposals: protectedProcedure
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
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only view your own proposals" });
      }
      if (input.walletAddress && input.walletAddress !== user.walletAddress) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only view your own proposals" });
      }
      if (input.clerkId || !input.walletAddress) {
        return ctx.db.query.proposals.findMany({
          where: eq(proposals.userId, user.id),
          orderBy: [desc(proposals.createdAt)],
          with: { lot: true, plan: true },
        });
      }
      if (input.walletAddress) {
        return ctx.db.query.proposals.findMany({
          where: eq(proposals.walletAddress, input.walletAddress),
          orderBy: [desc(proposals.createdAt)],
          with: { lot: true, plan: true },
        });
      }
      return [];
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: proposalStatusSchema,
        typedDataSignature: z.string().optional(),
        approvalTxHash: z.string().optional(),
        submittedTxHash: z.string().optional(),
        walletAddress: z.string().optional(),
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

      const existingProposal = await ctx.db.query.proposals.findFirst({
        where: eq(proposals.id, id),
      });
      if (!existingProposal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Proposal not found",
        });
      }
      if (existingProposal.userId !== requestingUser.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this proposal" });
      }

      const updateData = Object.fromEntries(
        Object.entries(rest).filter(([, v]) => v !== undefined),
      );
      const [proposal] = await ctx.db
        .update(proposals)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(proposals.id, id))
        .returning();
      if (!proposal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Proposal not found",
        });
      }
      return proposal;
    }),

  // Returns all proposals for lots belonging to the authenticated farmer
  forFarmer: protectedProcedure.query(async ({ ctx }) => {
    const farmer = await ctx.db.query.users.findFirst({
      where: eq(users.clerkId, ctx.clerkId),
      with: { farms: { with: { lots: true } } },
    });
    if (!farmer) return [];
    const farmerLotIds = farmer.farms.flatMap((f) => f.lots.map((l) => l.id));
    if (farmerLotIds.length === 0) return [];
    return ctx.db.query.proposals.findMany({
      where: inArray(proposals.lotId, farmerLotIds),
      orderBy: [desc(proposals.createdAt)],
      with: { lot: true, plan: true, user: true },
    });
  }),

  // Farmer approves a proposal: sets proposal → signed, lot → reserved, rejects others
  approve: protectedProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const farmer = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.clerkId),
      });
      if (!farmer) throw new TRPCError({ code: "UNAUTHORIZED" });

      const proposal = await ctx.db.query.proposals.findFirst({
        where: eq(proposals.id, input.proposalId),
        with: { lot: { with: { farm: true } } },
      });
      if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });

      const lotFarmerId = proposal.lot?.farm?.farmerId;
      if (lotFarmerId !== farmer.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your lot" });
      }

      await ctx.db
        .update(proposals)
        .set({ status: "signed", updatedAt: new Date() })
        .where(eq(proposals.id, input.proposalId));

      // Auto-reject other pending proposals on the same lot
      await ctx.db
        .update(proposals)
        .set({ status: "failed", updatedAt: new Date() })
        .where(
          and(
            eq(proposals.lotId, proposal.lotId),
            eq(proposals.status, "pending"),
          ),
        );

      await ctx.db
        .update(lots)
        .set({ status: "reserved", updatedAt: new Date() })
        .where(eq(lots.id, proposal.lotId));

      return { success: true };
    }),

  // Farmer rejects a proposal: sets proposal → failed
  reject: protectedProcedure
    .input(
      z.object({
        proposalId: z.number().int().positive(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const farmer = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.clerkId),
      });
      if (!farmer) throw new TRPCError({ code: "UNAUTHORIZED" });

      const proposal = await ctx.db.query.proposals.findFirst({
        where: eq(proposals.id, input.proposalId),
        with: { lot: { with: { farm: true } } },
      });
      if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });

      const lotFarmerId = proposal.lot?.farm?.farmerId;
      if (lotFarmerId !== farmer.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your lot" });
      }

      await ctx.db
        .update(proposals)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(proposals.id, input.proposalId));

      return { success: true };
    }),
});

export { proposalStatusSchema };
