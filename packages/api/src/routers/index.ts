import { todos } from "@harvverse-monorepo/db/schema";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  todos: router({
    list: publicProcedure.query(({ ctx }) => {
      return ctx.db.select().from(todos).orderBy(desc(todos.createdAt));
    }),
    create: publicProcedure
      .input(
        z.object({
          title: z.string().trim().min(1, "Todo title is required").max(120),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const [todo] = await ctx.db
          .insert(todos)
          .values({
            title: input.title,
          })
          .returning();

        return todo;
      }),
    toggle: publicProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          completed: z.boolean(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const [todo] = await ctx.db
          .update(todos)
          .set({
            completed: input.completed,
            updatedAt: new Date(),
          })
          .where(eq(todos.id, input.id))
          .returning();

        if (!todo) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Todo not found",
          });
        }

        return todo;
      }),
    delete: publicProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const [todo] = await ctx.db
          .delete(todos)
          .where(eq(todos.id, input.id))
          .returning();

        if (!todo) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Todo not found",
          });
        }

        return todo;
      }),
  }),
});
export type AppRouter = typeof appRouter;
