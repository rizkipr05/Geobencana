import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { Agent, setGlobalDispatcher } from "undici";

// Fix for Linux IPv6 DNS happy-eyeballs timeout when connecting to AWS Neon endpoints
if (typeof window === "undefined") {
  try {
    setGlobalDispatcher(new Agent({ connect: { autoSelectFamily: false } }));
  } catch {
    // Ignore in browser/edge environments
  }
}

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      const sql = neon(connectionString);
      _db = drizzle(sql, { schema });
    }
  }
  return _db;
}

// Export lazy-loaded db proxy so it always reads DATABASE_URL dynamically
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const instance = getDb();
    if (!instance) {
      return undefined;
    }
    return (instance as any)[prop];
  },
});

export { schema };
