import { Pool } from "pg";

let pool: Pool | undefined;

/** Lazily creates the PostgreSQL pool so guest-only deployments need no database. */
export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Accounts are not configured. Set DATABASE_URL to enable them.");
  pool ??= new Pool({
    connectionString,
    max: 10,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
  return pool;
}

