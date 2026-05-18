import type { NextRequest } from "next/server";

import { db } from "@harvverse-monorepo/db";
import type { Db } from "@harvverse-monorepo/db";

export type Context = {
  clerkId: string | null;
  db: Db;
};

export async function createContext(
  _req: NextRequest,
  opts?: { clerkId?: string | null },
): Promise<Context> {
  return {
    clerkId: opts?.clerkId ?? null,
    db,
  };
}
