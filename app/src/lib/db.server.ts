// Server-only D1 access. The DB binding exists because app.manifest.json sets
// "db": true; guard anyway (rule 4).
import type { D1Database } from "@cloudflare/workers-types";

import { bindings } from "./bindings.server";

export function db(): D1Database {
  const { DB } = bindings();
  if (!DB) {
    throw new Error("Database is not configured");
  }
  return DB;
}
