import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.js",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.PG_HOST || "127.0.0.1",
        port: parseInt(process.env.PG_PORT || "5432", 10),
        user: process.env.PG_USER || "postgres",
        password: process.env.PG_PASSWORD || undefined,
        database: process.env.PG_DATABASE || "medibook",
        ssl: process.env.PG_SSL === "true" ? { rejectUnauthorized: false } : false,
      },
  verbose: true,
  strict: true,
});

