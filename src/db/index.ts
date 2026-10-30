import { neonConfig, Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleNodePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import ws from "ws";

import * as schema from "./schema";

/**
 * One Drizzle façade over two transports:
 *  - Neon serverless WebSocket Pool (production / Neon)
 *  - node-postgres Pool (local development, Docker, CI)
 *
 * Both drivers expose the same Drizzle PgDatabase API, including interactive
 * transactions. Set DATABASE_URL to a Neon pooled connection string on Vercel.
 */
export type PortalDatabase = NodePgDatabase<typeof schema>;

type DatabaseBundle = {
  db: PortalDatabase;
  close: () => Promise<void>;
};

const globalForDb = globalThis as unknown as {
  __aictePortalDb?: DatabaseBundle;
};

function createDatabase(): DatabaseBundle {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not configured. Copy .env.example to .env.local and provide a Neon or local PostgreSQL URL.",
    );
  }

  const useNeon =
    process.env.DATABASE_DRIVER === "neon" ||
    /neon\.(tech|build|com)/i.test(url);

  if (useNeon) {
    // Neon's WebSocket Pool supports transactions and works in Node runtimes.
    neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
    neonConfig.poolQueryViaFetch = true;
    const pool = new NeonPool({ connectionString: url });
    return {
      db: drizzleNeon(pool, { schema }) as unknown as PortalDatabase,
      close: async () => {
        await pool.end();
      },
    };
  }

  const needsSsl =
    process.env.DATABASE_SSL === "true" || /sslmode=require/i.test(url);
  const pool = new PgPool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
  pool.on("error", (error) => {
    console.error("[db] Unexpected PostgreSQL pool error", error);
  });

  return {
    db: drizzleNodePg(pool, { schema }),
    close: async () => {
      await pool.end();
    },
  };
}

if (!globalForDb.__aictePortalDb) {
  globalForDb.__aictePortalDb = createDatabase();
}

export const db = globalForDb.__aictePortalDb.db;
export const closeDatabase = globalForDb.__aictePortalDb.close;

export { schema };
export * from "./schema";
