import { env } from "@harvverse-monorepo/env/server";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export * from "./schema";

export type Db = NodePgDatabase<typeof schema>;

export function createDb() {
	return drizzle(env.DATABASE_URL, { schema });
}

export const db = createDb();
