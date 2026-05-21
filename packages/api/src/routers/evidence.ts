import {
  evidenceRecords,
  insertEvidenceRecordSchema,
  partnerships,
  users,
} from "@harvverse-monorepo/db/schema";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

export const evidenceRouter = router({
  create: protectedProcedure
    .input(insertEvidenceRecordSchema)
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
      if (partnership.partnerUserId !== requestingUser.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this partnership" });
      }

      const [record] = await ctx.db
        .insert(evidenceRecords)
        .values(input)
        .returning();
      if (!record) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to record evidence",
        });
      }
      return record;
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
        !["admin", "verifier", "settlement_operator"].includes(requestingUser.role)
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot view this evidence" });
      }

      return ctx.db.query.evidenceRecords.findMany({
        where: eq(evidenceRecords.partnershipId, input.partnershipId),
        orderBy: [
          asc(evidenceRecords.milestoneNumber),
          asc(evidenceRecords.createdAt),
        ],
      });
    }),

  attest: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        easUid: z.string().optional(),
        registryTxHash: z.string().optional(),
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

      const existingRecord = await ctx.db.query.evidenceRecords.findFirst({
        where: eq(evidenceRecords.id, id),
      });
      if (!existingRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evidence record not found",
        });
      }
      const partnership = await ctx.db.query.partnerships.findFirst({
        where: eq(partnerships.id, existingRecord.partnershipId),
      });
      if (
        partnership?.partnerUserId !== requestingUser.id &&
        !["admin", "verifier", "settlement_operator"].includes(requestingUser.role)
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot attest this evidence" });
      }

      const [record] = await ctx.db
        .update(evidenceRecords)
        .set({
          status: "attested",
          ...rest,
          updatedAt: new Date(),
        })
        .where(eq(evidenceRecords.id, id))
        .returning();
      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evidence record not found",
        });
      }
      return record;
    }),
});
