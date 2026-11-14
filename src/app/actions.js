"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn, signOut } from "@/auth";
import { query } from "@/lib/db";
import { SPOT_IDS } from "@/lib/spots";
import { parseBRLToCents } from "@/lib/money";
import { isCoach } from "@/lib/roles";
import { novoToken, hashToken } from "@/lib/accessLinks";

// Só o técnico: coordenação do financeiro, notas individuais, links de acesso.
async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Ação não autorizada.");
  }
  return session.user;
}

// Técnico ou comissão técnica (staff): o dia a dia do time.
async function requireCoach() {
  const session = await auth();
  if (!isCoach(session?.user)) throw new Error("Ação não autorizada.");
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

// ---------- links de acesso (comissão técnica) ----------
const VALIDADES_DIAS = [7, 30, 90];

// Assinatura de useActionState: devolve o link uma única vez — no banco fica
// só o hash, então não dá para mostrar de novo depois.
export async function createAccessLink(_prev, formData) {
  await requireAdmin();
  const nome = String(formData.get("nome") || "").trim();
  const dias = Number(formData.get("dias"));
  if (!nome) return { erro: "Diga para quem é o link." };
  if (!VALIDADES_DIAS.includes(dias)) return { erro: "Validade inválida." };

  const token = novoToken();
  await query(
    `insert into access_links (nome, token_hash, expira_em)
     values ($1, $2, now() + make_interval(days => $3))`,
    [nome, hashToken(token), dias]
  );
  revalidatePath("/acessos");
  return { token, nome };
}

export async function revokeAccessLink(linkId) {
  await requireAdmin();
  await query("update access_links set revogado_em = now() where id = $1 and revogado_em is null", [
    linkId,
  ]);
  revalidatePath("/acessos");
}

export async function entrarComLink(token) {
  try {
    await signIn("link", { token, redirectTo: "/" });
  } catch (e) {
    // signIn redireciona lançando um erro de controle do Next; só tratamos
    // o caso de link inválido/revogado/expirado.
    if (e instanceof AuthError) redirect(`/entrar/${encodeURIComponent(token)}?erro=1`);
    throw e;
  }
}

// ---------- atletas ----------
export async function addAthlete(formData) {
  await requireCoach();
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

const STATUS = ["ativo", "observacao", "lesionado", "afastado"];

// "afastado" tira a atleta do lançamento de séries, do acompanhamento, do
// ranking e da conta das metas da equipe — é o jeito de marcar quem não está
// indo treinar sem apagar o histórico.
export async function updateAthleteStatus(personId, status) {
  await requireCoach();
  if (!STATUS.includes(status)) throw new Error("Status inválido.");
  await query("update people set status = $1 where id = $2 and role = 'athlete'", [
    status,
    personId,
  ]);
  revalidatePath("/atletas");
  revalidatePath(`/atletas/${personId}`);
  revalidatePath("/arremessos");
  revalidatePath("/ranking");
  revalidatePath("/metas");
}

export async function updateAthlete(personId, formData) {
  await requireCoach();
  const nome = String(formData.get("nome") || "").trim();
  const categoria = String(formData.get("categoria") || "");
  const status = String(formData.get("status") || "");
  if (!nome) throw new Error("O nome não pode ficar vazio.");
  if (!["F", "M"].includes(categoria)) throw new Error("Equipe inválida.");
  if (!STATUS.includes(status)) throw new Error("Status inválido.");

  await query(
    `update people set nome = $1, categoria = $2, curso = $3, posicao = $4, status = $5
     where id = $6 and role = 'athlete'`,
    [
      nome,
      categoria,
      String(formData.get("curso") || "").trim(),
      String(formData.get("posicao") || "").trim(),
      status,
      personId,
    ]
  );
  revalidatePath("/atletas");
  revalidatePath(`/atletas/${personId}`);
  revalidatePath("/arremessos");
  revalidatePath("/ranking");
  revalidatePath("/metas");
}

export async function deleteAthlete(personId) {
  await requireCoach();
  await query("delete from people where id = $1 and role = 'athlete'", [personId]);
  revalidatePath("/atletas");
  revalidatePath("/escalacao");
}

// ---------- coordenação do financeiro ----------
// Coordenar não é um cadastro à parte: é ligar uma flag numa atleta que já
// existe. Ela continua jogando; só passa a enxergar o Financeiro da equipe dela.
export async function addCoordinator(formData) {
  await requireAdmin();
  const personId = Number(formData.get("personId"));
  if (!personId) throw new Error("Escolha uma atleta para a coordenação.");

  const { rowCount } = await query(
    "update people set coordena = true where id = $1 and role = 'athlete' and categoria is not null",
    [personId]
  );
  if (!rowCount) throw new Error("Atleta não encontrada ou sem equipe definida.");
  revalidatePath("/atletas");
  revalidatePath("/financeiro");
}

export async function removeCoordinator(personId) {
  await requireAdmin();
  // Só tira o acesso ao financeiro — a atleta segue cadastrada normalmente.
  await query("update people set coordena = false where id = $1", [personId]);
  revalidatePath("/atletas");
  revalidatePath("/financeiro");
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
  await requireCoach();
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

// Diário de treinos: registro datado do que rolou numa sessão específica
// (não confundir com a rotina padrão do dia da semana, acima). Fica visível
// para as atletas da equipe, então quem faltou consegue se atualizar.
export async function addTrainingLog(formData) {
  await requireCoach();
  const categoria = formData.get("categoria");
  const data = String(formData.get("data") || "").trim();
  const texto = String(formData.get("texto") || "").trim();
  if (!["F", "M"].includes(categoria)) throw new Error("Equipe inválida.");
  if (!texto) throw new Error("Escreva o que rolou no treino.");

  await query(
    `insert into training_logs (categoria, data, texto)
     values ($1, coalesce(nullif($2, '')::date, current_date), $3)`,
    [categoria, data, texto]
  );
  revalidatePath("/treinos");
}

export async function updateTrainingLog(logId, formData) {
  await requireCoach();
  const data = String(formData.get("data") || "").trim();
  const texto = String(formData.get("texto") || "").trim();
  if (!texto) throw new Error("Escreva o que rolou no treino.");

  await query(
    "update training_logs set data = coalesce(nullif($1, '')::date, data), texto = $2 where id = $3",
    [data, texto, logId]
  );
  revalidatePath("/treinos");
}

export async function deleteTrainingLog(logId) {
  await requireCoach();
  await query("delete from training_logs where id = $1", [logId]);
  revalidatePath("/treinos");
}

// ---------- competições ----------
export async function updateCompetition(id, formData) {
  await requireCoach();
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
  await requireCoach();
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
  await requireCoach();
  await query("delete from squads where id = $1", [squadId]);
  revalidatePath("/escalacao");
}

export async function toggleSquadMember(squadId, personId, convocado) {
  await requireCoach();
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
  await requireCoach();
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
  await requireCoach();
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
  await requireCoach();
  await query("delete from plays where id = $1", [playId]);
  revalidatePath("/jogadas");
}

// ---------- exercícios de arremesso ----------
// Sugestões do técnico para o time fazer; a atleta só lê.
export async function addShootingDrill(formData) {
  await requireCoach();
  const nome = String(formData.get("nome") || "").trim();
  const categoria = String(formData.get("categoria") || "ambos");
  const videoUrl = String(formData.get("video_url") || "").trim();
  const pontos = formData.getAll("pontos").map(String).filter((p) => SPOT_IDS.includes(p));

  if (!nome) throw new Error("Dê um nome ao exercício.");
  if (!["F", "M", "ambos"].includes(categoria)) throw new Error("Equipe inválida.");
  // O link vira href na página: só http(s), nada de javascript: e afins.
  if (videoUrl && !/^https?:\/\//i.test(videoUrl)) {
    throw new Error("O link do vídeo precisa começar com http:// ou https://.");
  }

  await query(
    `insert into shooting_drills (nome, categoria, objetivo, descricao, video_url, pontos)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      nome,
      categoria,
      String(formData.get("objetivo") || "").trim(),
      String(formData.get("descricao") || "").trim(),
      videoUrl,
      pontos,
    ]
  );
  revalidatePath("/arremessos");
}

export async function deleteShootingDrill(drillId) {
  await requireCoach();
  await query("delete from shooting_drills where id = $1", [drillId]);
  revalidatePath("/arremessos");
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

// O tecnico lanca serie para qualquer atleta; a atleta so para si mesma —
// o personId do formulario e ignorado e vem da sessao. A equipe sempre vem
// do cadastro, nunca do formulario.
export async function addShootingSet(formData) {
  const user = await requireUser();
  const personId =
    isCoach(user) ? Number(formData.get("personId")) : Number(user.personId);

  const { rows } = await query(
    "select categoria from people where id = $1 and role = 'athlete'",
    [personId]
  );
  const categoria = rows[0]?.categoria;
  const spot = String(formData.get("spot") || "");
  const tentativas = Number(formData.get("tentativas"));
  const acertos = Number(formData.get("acertos"));

  if (!rows.length) throw new Error("Atleta não encontrada.");
  if (!["F", "M"].includes(categoria)) throw new Error("Atleta sem equipe definida no cadastro.");
  if (!SPOT_IDS.includes(spot)) throw new Error("Ponto da quadra invalido.");
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
  const user = await requireUser();
  if (isCoach(user)) {
    await query("delete from shooting_sets where id = $1", [setId]);
  } else {
    // A atleta so apaga as proprias series.
    await query("delete from shooting_sets where id = $1 and person_id = $2", [
      setId,
      user.personId,
    ]);
  }
  revalidatePath("/arremessos");
  revalidatePath("/minha-ficha");
}

// ---------- financeiro ----------

async function requireFinance() {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "admin" && !user.coordena)) {
    throw new Error("Ação não autorizada.");
  }
  return user;
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
