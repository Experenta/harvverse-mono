import { env } from "@harvverse-monorepo/env/server";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema";

export * from "./schema";

export type Db = NodePgDatabase<typeof schema>;

function createPool() {
	const url = env.DATABASE_URL;
	if (url.includes(".rds.amazonaws.com")) {
		return new pg.Pool({
			connectionString: url,
			ssl: { rejectUnauthorized: false },
		});
	}
	return new pg.Pool({ connectionString: url });
}

export function createDb() {
	return drizzle(createPool(), { schema });
}

export const db = createDb();
