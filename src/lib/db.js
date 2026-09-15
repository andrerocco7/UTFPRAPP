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

// Reaproveita o pool entre invocações da mesma instância serverless (Vercel).
// Sem isso em produção, cada nova invocação criava um Pool novo (até 5
// conexões) sem nunca fechar os anteriores — sob rajada (o Next pré-carrega
// todos os links da barra lateral de uma vez), várias instâncias abrindo
// pools em paralelo estouravam o limite de conexões do Neon e alguma
// requisição aleatória (login, POST de treinos, etc.) caía com erro 500.
export const pool =
  globalForPg._basquetePgPool ||
  new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 5,
  });

globalForPg._basquetePgPool = pool;

export function query(text, params) {
  return pool.query(text, params);
}
