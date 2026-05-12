import { env } from "@harvverse-monorepo/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export function createDb() {
  return drizzle(env.DATABASE_URL, { schema });
}

export type Db = ReturnType<typeof createDb>;

export const db = createDb();
