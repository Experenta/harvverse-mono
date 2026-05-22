import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  dotenv.config({
    path: process.env.DOTENV_PATH ?? "../../apps/web/.env",
  });
}

const databaseUrl = process.env.DATABASE_URL || "";
const useRdsSsl =
  databaseUrl.includes(".rds.amazonaws.com") ||
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false";

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
    // RDS uses Amazon CA; Node pg otherwise throws SELF_SIGNED_CERT_IN_CHAIN with sslmode=require.
    ...(useRdsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  },
});
