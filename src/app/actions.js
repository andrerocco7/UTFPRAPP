"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import { query } from "@/lib/db";
import { SPOT_IDS } from "@/lib/spots";
import { parseBRLToCents } from "@/lib/money";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Ação não autorizada.");
  }
  return session.user;
}

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");
  return session.user;
}

// ---------- auth ----------
export async function signInGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

// ---------- atletas ----------
export async function addAthlete(formData) {
  await requireAdmin();
  const nome = String(formData.get("nome") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!nome || !email) throw new Error("Nome e e-mail institucional são obrigatórios.");

  await query(
    `insert into people (nome, email, role, categoria, curso, posicao, status)
     values ($1, $2, 'athlete', $3, $4, $5, $6)`,
    [
      nome,
      email,
      formData.get("categoria") || "F",
      String(formData.get("curso") || "").trim(),
      String(formData.get("posicao") || "").trim(),
      formData.get("status") || "ativo",
    ]
  );
  revalidatePath("/atletas");
}

export async function deleteAthlete(personId) {
  await requireAdmin();
  await query("delete from people where id = $1 and role = 'athlete'", [personId]);
  revalidatePath("/atletas");
  revalidatePath("/escalacao");
}

export async function addNote(personId, formData) {
  await requireAdmin();
  const texto = String(formData.get("texto") || "").trim();
  if (!texto) return;
  await query("insert into notes (person_id, texto) values ($1, $2)", [personId, texto]);
  revalidatePath(`/atletas/${personId}`);
}

// ---------- treinos ----------
export async function updateTraining(categoria, dia, formData) {
  await requireAdmin();
  const rotina = String(formData.get("rotina") || "");
  const videoUrl = String(formData.get("video_url") || "").trim();
  await query(
    `insert into trainings (categoria, dia, rotina, video_url)
     values ($1, $2, $3, $4)
     on conflict (categoria, dia) do update set rotina = excluded.rotina, video_url = excluded.video_url`,
    [categoria, dia, rotina, videoUrl]
  );
  revalidatePath("/treinos");
}

// ---------- competições ----------
export async function updateCompetition(id, formData) {
  await requireAdmin();
  await query(
    `update competitions set periodo = $2, regras = $3, historico_f = $4, historico_m = $5 where id = $1`,
    [
      id,
      String(formData.get("periodo") || ""),
      String(formData.get("regras") || ""),
      String(formData.get("historico_f") || ""),
      String(formData.get("historico_m") || ""),
    ]
  );
  revalidatePath("/competicoes");
}

// ---------- escalação ----------
export async function createSquad(formData) {
  await requireAdmin();
  const competitionId = formData.get("competicao");
  const categoria = formData.get("categoria");
  const ano = Number(formData.get("ano")) || new Date().getFullYear();
  await query(
    "insert into squads (competition_id, categoria, ano) values ($1, $2, $3)",
    [competitionId, categoria, ano]
  );
  revalidatePath("/escalacao");
}

export async function deleteSquad(squadId) {
  await requireAdmin();
  await query("delete from squads where id = $1", [squadId]);
  revalidatePath("/escalacao");
}

export async function toggleSquadMember(squadId, personId, convocado) {
  await requireAdmin();
  await query(
    `insert into squad_members (squad_id, person_id, convocado, motivo_corte)
     values ($1, $2, $3, '')
     on conflict (squad_id, person_id) do update set convocado = excluded.convocado,
       motivo_corte = case when excluded.convocado then '' else squad_members.motivo_corte end`,
    [squadId, personId, convocado]
  );
  revalidatePath("/escalacao");
  revalidatePath("/minha-ficha");
}

export async function setCutReason(squadId, personId, formData) {
  await requireAdmin();
  const motivo = String(formData.get("motivo") || "");
  await query(
    `insert into squad_members (squad_id, person_id, convocado, motivo_corte)
     values ($1, $2, false, $3)
     on conflict (squad_id, person_id) do update set motivo_corte = excluded.motivo_corte`,
    [squadId, personId, motivo]
  );
  revalidatePath("/escalacao");
  revalidatePath("/minha-ficha");
}

// ---------- jogadas ----------
export async function addPlay(formData) {
  await requireAdmin();
  const nome = String(formData.get("nome") || "").trim();
  if (!nome) return;
  await query(
    `insert into plays (nome, categoria, situacao, descricao, video_url) values ($1, $2, $3, $4, $5)`,
    [
      nome,
      formData.get("categoria") || "ambos",
      String(formData.get("situacao") || "").trim(),
      String(formData.get("descricao") || "").trim(),
      String(formData.get("video_url") || "").trim(),
    ]
  );
  revalidatePath("/jogadas");
}

export async function deletePlay(playId) {
  await requireAdmin();
  await query("delete from plays where id = $1", [playId]);
  revalidatePath("/jogadas");
}

// ---------- treinos de arremesso ----------

// Uma sessao por dia e categoria — reabrir a pagina no mesmo treino
// continua lancando na mesma sessao em vez de criar outra.
async function sessionDoDia(categoria) {
  const { rows } = await query(
    `insert into shooting_sessions (data, categoria)
     values (current_date, $1)
     on conflict (data, categoria) do update set categoria = excluded.categoria
     returning id`,
    [categoria]
  );
  return rows[0].id;
}

export async function addShootingSet(formData) {
  await requireAdmin();

  const personId = Number(formData.get("personId"));
  const categoria = String(formData.get("categoria") || "");
  const spot = String(formData.get("spot") || "");
  const tentativas = Number(formData.get("tentativas"));
  const acertos = Number(formData.get("acertos"));

  if (!SPOT_IDS.includes(spot)) throw new Error("Ponto da quadra invalido.");
  if (!["F", "M"].includes(categoria)) throw new Error("Categoria invalida.");
  if (!Number.isInteger(tentativas) || tentativas < 1 || tentativas > 200) {
    throw new Error("Numero de tentativas invalido.");
  }
  if (!Number.isInteger(acertos) || acertos < 0 || acertos > tentativas) {
    throw new Error("Numero de acertos invalido.");
  }

  const sessionId = await sessionDoDia(categoria);
  await query(
    `insert into shooting_sets (session_id, person_id, spot, tentativas, acertos)
     values ($1, $2, $3, $4, $5)`,
    [sessionId, personId, spot, tentativas, acertos]
  );

  revalidatePath("/arremessos");
  revalidatePath("/minha-ficha");
}

export async function deleteShootingSet(setId) {
  await requireAdmin();
  await query("delete from shooting_sets where id = $1", [setId]);
  revalidatePath("/arremessos");
  revalidatePath("/minha-ficha");
}

// ---------- financeiro ----------

async function requireFinance() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || !["admin", "coordinator"].includes(role)) {
    throw new Error("Ação não autorizada.");
  }
  return session.user;
}

// Coordenador so mexe na propria equipe; o tecnico mexe nas duas.
function checaEscopo(user, categoria) {
  if (user.role === "admin") return;
  if (categoria !== user.categoria) {
    throw new Error("Fora do escopo da sua equipe.");
  }
}

export async function addCharge(formData) {
  const user = await requireFinance();

  const titulo = String(formData.get("titulo") || "").trim();
  const categoria = String(formData.get("categoria") || "");
  const centavos = parseBRLToCents(formData.get("valor"));
  const vencimento = String(formData.get("vencimento") || "").trim() || null;

  if (!titulo) throw new Error("Descreva a cobrança.");
  if (!["F", "M", "ambos"].includes(categoria)) throw new Error("Equipe inválida.");
  if (!centavos) throw new Error("Valor inválido.");
  checaEscopo(user, categoria);

  await query(
    `insert into finance_charges (titulo, categoria, valor_centavos, vencimento)
     values ($1, $2, $3, $4)`,
    [titulo, categoria, centavos, vencimento]
  );
  revalidatePath("/financeiro");
}

export async function deleteCharge(chargeId) {
  await requireFinance();
  await query("delete from finance_charges where id = $1", [chargeId]);
  revalidatePath("/financeiro");
}

export async function togglePayment(chargeId, personId, pago) {
  await requireFinance();
  if (pago) {
    await query(
      `insert into finance_payments (charge_id, person_id)
       values ($1, $2) on conflict do nothing`,
      [chargeId, personId]
    );
  } else {
    await query(
      "delete from finance_payments where charge_id = $1 and person_id = $2",
      [chargeId, personId]
    );
  }
  revalidatePath("/financeiro");
}

export async function addExpense(formData) {
  const user = await requireFinance();

  const descricao = String(formData.get("descricao") || "").trim();
  const categoria = String(formData.get("categoria") || "");
  const tipo = String(formData.get("tipo") || "outro");
  const centavos = parseBRLToCents(formData.get("valor"));
  const data = String(formData.get("data") || "").trim() || null;

  if (!descricao) throw new Error("Descreva o gasto.");
  if (!["F", "M", "ambos"].includes(categoria)) throw new Error("Equipe inválida.");
  if (!centavos) throw new Error("Valor inválido.");
  checaEscopo(user, categoria);

  await query(
    `insert into finance_expenses (descricao, categoria, tipo, valor_centavos, data)
     values ($1, $2, $3, $4, coalesce($5::date, current_date))`,
    [descricao, categoria, tipo, centavos, data]
  );
  revalidatePath("/financeiro");
}

export async function deleteExpense(expenseId) {
  await requireFinance();
  await query("delete from finance_expenses where id = $1", [expenseId]);
  revalidatePath("/financeiro");
}
