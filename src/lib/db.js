import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  console.warn(
    "[db] Nenhuma variável DATABASE_URL / POSTGRES_URL encontrada — as consultas ao banco vão falhar."
  );
}

const isLocal =
  connectionString?.includes("localhost") || connectionString?.includes("127.0.0.1");

const globalForPg = globalThis;

export const pool =
  globalForPg._basquetePgPool ||
  new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg._basquetePgPool = pool;
}

export function query(text, params) {
  return pool.query(text, params);
}
