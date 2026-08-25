import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/** CFA_DATABASE_URL is the canonical variable; DATABASE_URL kept as a legacy fallback. */
const connectionString = process.env.CFA_DATABASE_URL ?? process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  prepare: false,
  max: 10,
  idle_timeout: 20,
});

export const db = drizzle(client, { schema });
export { schema };
