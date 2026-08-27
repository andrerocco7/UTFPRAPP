// Cria as tabelas (se não existirem) e garante que o técnico exista como admin.
// Uso: node scripts/seed.js
// Requer as variáveis de ambiente DATABASE_URL (ou POSTGRES_URL), COACH_EMAIL e COACH_NAME.

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("Defina DATABASE_URL (ou POSTGRES_URL) antes de rodar o seed.");
  process.exit(1);
}

const coachEmail = (process.env.COACH_EMAIL || "").trim().toLowerCase();
const coachName = process.env.COACH_NAME || "Técnico";

if (!coachEmail) {
  console.error("Defina COACH_EMAIL (o e-mail institucional do técnico) antes de rodar o seed.");
  process.exit(1);
}

const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

async function main() {
  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  const schema = fs.readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8");
  console.log("Aplicando schema...");
  await pool.query(schema);

  console.log(`Garantindo conta de técnico (admin) para ${coachEmail}...`);
  await pool.query(
    `insert into people (nome, email, role)
     values ($1, $2, 'admin')
     on conflict (email) do update set role = 'admin', nome = excluded.nome`,
    [coachName, coachEmail]
  );

  console.log("Pronto!");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
