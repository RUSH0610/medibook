import pg from "pg";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

dotenv.config();

const { Pool } = pg;

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PG_SSL === "true" ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host: process.env.PG_HOST || "127.0.0.1",
      port: parseInt(process.env.PG_PORT || "5432", 10),
      user: process.env.PG_USER || "postgres",
      password: process.env.PG_PASSWORD || undefined,
      database: process.env.PG_DATABASE || "medibook",
      ssl: process.env.PG_SSL === "true" ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

export const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

// Configure Drizzle ORM instance wrapping the existing pool
export const db = drizzle(pool, { schema });

// Execute a query with parameters
// @param {string} text - SQL query text
// @param {Array} params - Query parameters
// @returns {Promise<pg.QueryResult>}
export const query = (text, params) => pool.query(text, params);

// Get a client from the pool for transactions
// @returns {Promise<pg.PoolClient>}
export const getClient = () => pool.connect();

// Execute a callback within an ACID transaction
// @param {Function} callback - Async function receiving the pg client
// @param {string} isolationLevel - Optional isolation level (e.g. 'READ COMMITTED', 'SERIALIZABLE')
// @returns {Promise<any>}
export const withTransaction = async (callback, isolationLevel = "READ COMMITTED") => {
  const client = await pool.connect();
  try {
    await client.query(`BEGIN TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Verify database connection
export const testConnection = async () => {
  const res = await pool.query("SELECT NOW() as current_time, current_database() as db");
  console.log(`[PostgreSQL] Connected successfully to "${res.rows[0].db}" at ${res.rows[0].current_time}`);
  return res.rows[0];
};

export { schema };

export default {
  db,
  pool,
  schema,
  query,
  getClient,
  withTransaction,
  testConnection,
};

