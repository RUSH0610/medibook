import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool, query } from "./index.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Ensures the database schema is initialized and up to date.
 * For existing databases with tables already present, it marks the initial baseline
 * without dropping or resetting any data.
 */
export async function runMigrations() {
  console.log("[Drizzle Migration] Checking schema and migrations...");

  // Check if users table already exists in public schema
  const tableCheck = await query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    ) as exists;
  `);

  const tablesAlreadyExist = tableCheck.rows[0]?.exists;

  // Check if __drizzle_migrations tracking table exists
  const migrationTableCheck = await query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'drizzle' 
      AND table_name = '__drizzle_migrations'
    ) as exists;
  `);

  const migrationTableExists = migrationTableCheck.rows[0]?.exists;

  try {
    if (tablesAlreadyExist && !migrationTableExists) {
      // Establish baseline tracking for existing database without re-executing CREATE TABLE statements
      console.log("[Drizzle Migration] Existing tables detected without Drizzle migration history. Establishing baseline...");
      await query(`CREATE SCHEMA IF NOT EXISTS drizzle;`);
      await query(`
        CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
          id SERIAL PRIMARY KEY,
          hash text NOT NULL,
          created_at bigint
        );
      `);

      const journalPath = path.join(__dirname, "migrations", "meta", "_journal.json");
      if (fs.existsSync(journalPath)) {
        const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
        for (const entry of journal.entries || []) {
          const checkRecorded = await query(`SELECT id FROM drizzle.__drizzle_migrations WHERE hash = $1`, [entry.tag]);
          if (!checkRecorded.rows.length) {
            await query(
              `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
              [entry.tag, entry.when]
            );
          }
        }
      }
      console.log("[Drizzle Migration] Baseline successfully established.");
    } else {
      await migrate(db, {
        migrationsFolder: path.join(__dirname, "migrations"),
      });
      console.log("[Drizzle Migration] Migrations applied successfully.");
    }
  } catch (error) {
    console.error("[Drizzle Migration] Migration error:", error.message);
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
