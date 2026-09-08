import "server-only";
import path from "path";
import * as schema from "./schema";

/**
 * Database client.
 *
 * - If `DATABASE_URL` is set (e.g. a hosted Postgres like Neon/Supabase/RDS), we connect to it
 *   with `drizzle-orm/node-postgres` — this is the real production path.
 * - Otherwise we fall back to an embedded PGlite (a genuine Postgres engine compiled to WASM,
 *   not a mock) persisted to `data/pgdata/` on local disk — zero external services required for
 *   local development/sandboxes, but 100% the same SQL dialect & schema as production.
 *
 * Both paths share the exact same Drizzle schema, so switching to a real hosted database later is
 * just setting an environment variable — no code or migration changes needed.
 */

const MIGRATIONS_FOLDER = path.join(process.cwd(), "src", "lib", "db", "migrations");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbPromise: Promise<any> | null = null;

async function createDb() {
  if (process.env.DATABASE_URL) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    return db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = path.join(process.cwd(), "data", "pgdata");
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}

/** Lazily-created, process-wide singleton so we never open two embedded PGlite instances. */
export async function getDb() {
  if (!dbPromise) {
    dbPromise = createDb();
  }
  return dbPromise;
}

export { schema };

