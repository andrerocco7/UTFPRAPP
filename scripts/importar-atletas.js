// Adiciona atletas ao banco a partir de um arquivo JSON, sem duplicar quem já existe.
//
// Uso:
//   node scripts/importar-atletas.js [caminho-do-json]
//
// Se nenhum caminho for passado, usa scripts/atletas-a-adicionar.json.
// Precisa de DATABASE_URL (ou POSTGRES_URL) em .env.local ou nas variáveis de ambiente.
//
// É seguro rodar mais de uma vez: quem já está cadastrado (mesmo e-mail) é apenas
// ignorado — só quem realmente faltava é inserido.

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const jsonPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, "atletas-a-adicionar.json");

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("Defina DATABASE_URL (ou POSTGRES_URL) em .env.local antes de rodar.");
  process.exit(1);
}

const atletas = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

async function main() {
  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  const adicionadas = [];
  const jaExistiam = [];

  for (const a of atletas) {
    const nome = String(a.nome || "").trim();
    const email = String(a.email || "").trim().toLowerCase();
    const categoria = a.categoria === "M" ? "M" : "F";
    const curso = String(a.curso || "").trim();

    if (!nome || !email) {
      console.warn("Ignorando entrada sem nome/e-mail:", a);
      continue;
    }

    const { rows } = await pool.query(
      `insert into people (nome, email, role, categoria, curso, status)
       values ($1, $2, 'athlete', $3, $4, 'ativo')
       on conflict (email) do nothing
       returning id`,
      [nome, email, categoria, curso]
    );

    if (rows.length) {
      adicionadas.push(`${nome} <${email}>`);
    } else {
      jaExistiam.push(`${nome} <${email}>`);
    }
  }

  console.log(`\n✅ Adicionadas agora (estavam faltando) — ${adicionadas.length}:`);
  adicionadas.forEach((x) => console.log("  +", x));

  console.log(`\nℹ️  Já estavam cadastradas — ${jaExistiam.length}:`);
  jaExistiam.forEach((x) => console.log("  =", x));

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
