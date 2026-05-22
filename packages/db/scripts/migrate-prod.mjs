import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const __dirname = dirname(fileURLToPath(import.meta.url));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes(".rds.amazonaws.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

const db = drizzle(pool);

try {
  console.log("[migrate] applying migrations from src/migrations …");
  await migrate(db, { migrationsFolder: join(__dirname, "../src/migrations") });
  console.log("[migrate] success");
} catch (error) {
  console.error("[migrate] failed:", error);
  process.exit(1);
} finally {
  await pool.end();
}
