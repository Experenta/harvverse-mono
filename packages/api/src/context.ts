import type { NextRequest } from "next/server";

import { db } from "@harvverse-monorepo/db";
import type { Db } from "@harvverse-monorepo/db";

export type Context = {
  auth: null;
  db: Db;
  session: null;
};

export async function createContext(_req: NextRequest): Promise<Context> {
  return {
    auth: null,
    db,
    session: null,
  };
}
