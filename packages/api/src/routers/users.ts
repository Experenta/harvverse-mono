import {
  insertUserSchema,
  userRoleEnum,
  userStatusEnum,
  users,
} from "@harvverse-monorepo/db/schema";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";

const roleSchema = z.enum(userRoleEnum.enumValues);
const statusSchema = z.enum(userStatusEnum.enumValues);

export const usersRouter = router({
  me: publicProcedure
    .input(z.object({ clerkId: z.string().trim().min(1) }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, input.clerkId),
      });
      return user ?? null;
    }),

  upsert: publicProcedure
    .input(
      insertUserSchema
        .pick({ displayName: true, role: true })
        .extend({
          clerkId: z.string().trim().min(1),
          email: z.string().email().optional(),
          walletAddress: z.string().optional(),
          phone: z.string().optional(),
          country: z.string().optional(),
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .insert(users)
        .values(input)
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            displayName: input.displayName,
            role: input.role,
            ...(input.email !== undefined && { email: input.email }),
            ...(input.walletAddress !== undefined && {
              walletAddress: input.walletAddress,
            }),
            ...(input.phone !== undefined && { phone: input.phone }),
            ...(input.country !== undefined && { country: input.country }),
            updatedAt: new Date(),
          },
        })
        .returning();

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upsert user",
        });
      }

      return user;
    }),

  // Admin-only (auth middleware TBD).
  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: statusSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .update(users)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(users.id, input.id))
        .returning();

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return user;
    }),
});

export { roleSchema, statusSchema };
