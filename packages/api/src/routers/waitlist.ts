import { waitlistEntries } from "@harvverse-monorepo/db/schema";
import { z } from "zod";

import { publicProcedure, router } from "../index";

const investmentRangeSchema = z.enum([
  "$1,595 – $3,000",
  "$3,000 – $5,000",
  "$5,000 – $15,000",
  "$15,000 – $50,000",
  "$50,000+",
]);

export const waitlistRouter = router({
  submit: publicProcedure
    .input(
      z.object({
        fullName: z.string().trim().min(2),
        email: z.string().email(),
        country: z.string().trim().min(1),
        investmentRange: investmentRangeSchema,
        howHeard: z.string().trim().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(waitlistEntries)
        .values({
          fullName: input.fullName,
          email: input.email,
          country: input.country,
          investmentRange: input.investmentRange,
          howHeard: input.howHeard || undefined,
        })
        .onConflictDoNothing({ target: waitlistEntries.email });

      return { success: true };
    }),
});
