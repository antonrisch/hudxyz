import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import { getTursoConfig } from "./env";

let client: Client | undefined;
let database: LibSQLDatabase | undefined;

export function getDb(): LibSQLDatabase {
  if (!database) {
    const { url, authToken } = getTursoConfig();
    client = createClient({ url, authToken });
    database = drizzle({ client });
  }

  return database;
}

export type Database = LibSQLDatabase;
export * from "./schema";
