import pg from "pg";

const { Pool } = pg;
let pool;

export const isDatabaseConfigured = () => Boolean(process.env.DATABASE_URL);

export const getDatabasePool = () => {
  if (!isDatabaseConfigured()) return null;
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  return pool;
};
