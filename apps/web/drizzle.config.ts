import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.TURSO_CONNECTION_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
