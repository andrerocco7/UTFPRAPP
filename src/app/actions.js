"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import { query } from "@/lib/db";

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
