import { publicProcedure, router } from "../index";
import { evidenceRouter } from "./evidence";
import { farmsRouter } from "./farms";
import { lotsRouter } from "./lots";
import { partnershipsRouter } from "./partnerships";
import { plansRouter } from "./plans";
import { proposalsRouter } from "./proposals";
import { settlementsRouter } from "./settlements";
import { usersRouter } from "./users";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => "OK"),
  users: usersRouter,
  farms: farmsRouter,
  lots: lotsRouter,
  plans: plansRouter,
  proposals: proposalsRouter,
  partnerships: partnershipsRouter,
  evidence: evidenceRouter,
  settlements: settlementsRouter,
});

export type AppRouter = typeof appRouter;
