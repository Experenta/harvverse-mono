import {
  insertProposalSchema,
  proposalStatusEnum,
  proposals,
} from "@harvverse-monorepo/db/schema";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";

const proposalStatusSchema = z.enum(proposalStatusEnum.enumValues);

export const proposalsRouter = router({
  // Partner-only (auth middleware TBD).
  create: publicProcedure
    .input(insertProposalSchema)
    .mutation(async ({ ctx, input }) => {
      const [proposal] = await ctx.db
        .insert(proposals)
        .values(input)
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
    .input(z.object({ walletAddress: z.string().trim().min(1) }))
    .query(({ ctx, input }) => {
      return ctx.db.query.proposals.findMany({
        where: eq(proposals.walletAddress, input.walletAddress),
        orderBy: [desc(proposals.createdAt)],
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
        status: proposalStatusSchema,
        typedDataSignature: z.string().optional(),
        approvalTxHash: z.string().optional(),
        submittedTxHash: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [proposal] = await ctx.db
        .update(proposals)
        .set({ ...rest, updatedAt: new Date() })
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
});

export { proposalStatusSchema };
