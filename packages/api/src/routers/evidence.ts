import {
  evidenceRecords,
  insertEvidenceRecordSchema,
} from "@harvverse-monorepo/db/schema";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";

export const evidenceRouter = router({
  create: publicProcedure
    .input(insertEvidenceRecordSchema)
    .mutation(async ({ ctx, input }) => {
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

  byPartnership: publicProcedure
    .input(z.object({ partnershipId: z.number().int().positive() }))
    .query(({ ctx, input }) => {
      return ctx.db.query.evidenceRecords.findMany({
        where: eq(evidenceRecords.partnershipId, input.partnershipId),
        orderBy: [
          asc(evidenceRecords.milestoneNumber),
          asc(evidenceRecords.createdAt),
        ],
      });
    }),

  attest: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        easUid: z.string().optional(),
        registryTxHash: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
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
