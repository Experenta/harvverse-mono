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

import { protectedProcedure, publicProcedure, router } from "../index";

const proposalStatusSchema = z.enum(proposalStatusEnum.enumValues);

export const proposalsRouter = router({
  create: protectedProcedure
    .input(
      insertProposalSchema
        .extend({ expiresAt: z.coerce.date() })
        .extend({ walletAddress: z.string().optional().default("") }),
    )
    .mutation(async ({ ctx, input }) => {
      const [proposal] = await ctx.db
        .insert(proposals)
        .values({ ...input, walletAddress: input.walletAddress ?? "" })
        .returning();
      if (!proposal) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create proposal",
        });
      }
      return proposal;
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const proposal = await ctx.db.query.proposals.findFirst({
        where: eq(proposals.id, input.id),
        with: {
          lot: true,
          plan: true,
        },
      });
      if (!proposal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Proposal not found",
        });
      }
      return proposal;
    }),

  myProposals: publicProcedure
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
