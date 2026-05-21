import { auth } from "@clerk/nextjs/server";
import { createContext } from "@harvverse-monorepo/api/context";
import { appRouter } from "@harvverse-monorepo/api/routers/index";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { NextRequest } from "next/server";

async function handler(req: NextRequest) {
  const { userId } = await auth();
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req, { clerkId: userId }),
  });
}
export { handler as GET, handler as POST };
