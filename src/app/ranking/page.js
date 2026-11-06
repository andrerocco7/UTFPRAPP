import Link from "next/link";
import { requireSessionPage } from "@/components/Guard";
import { query } from "@/lib/db";
import { CategoryTag } from "@/components/Tag";

const PERIODOS = [
  ["semana", "Esta semana"],
  ["mes", "Este mês"],
  ["geral", "Geral"],
];

const ORDENS = [
  ["arremessos", "Arremessos"],
  ["acertos", "Acertos"],
  ["aproveitamento", "Aproveitamento"],
];

// Abaixo disso a atleta não entra no ranking de aproveitamento: 3 de 3 não
// pode passar na frente de quem arremessou 200.
const MIN_APROVEITAMENTO = 20;

const MEDALHAS = ["🥇", "🥈", "🥉"];

function pct(m, a) {
  return a ? Math.round((m / a) * 100) : null;
}

function cor(p) {
  if (p === null) return "var(--text-muted)";
  if (p >= 50) return "var(--success)";
  if (p >= 33) return "var(--warn)";
  return "var(--danger)";
}

function fmt(n) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

// Posição de competição: empate divide a posição (1, 1, 3).
function comPosicao(lista, valor) {
  let pos = 0;
  let anterior = null;
  return lista.map((item, i) => {
    const v = valor(item);
    if (v !== anterior) {
      pos = i + 1;
      anterior = v;
    }
    return { ...item, pos };
  });
}

export default async function RankingPage({ searchParams }) {
  const user = await requireSessionPage();
  const params = await searchParams;
  const periodo = PERIODOS.some(([p]) => p === params.periodo) ? params.periodo : "geral";
  const ordem = ORDENS.some(([o]) => o === params.ordem) ? params.ordem : "arremessos";

  const { rows: atletas } = await query(
    `select p.id, p.nome, p.categoria,
            sum(st.tentativas)::int as tentativas,
            sum(st.acertos)::int as acertos,
            count(distinct st.session_id)::int as treinos
     from shooting_sets st
     join shooting_sessions ss on ss.id = st.session_id
     join people p on p.id = st.person_id
     where p.role = 'athlete'
       and ss.data >= case $1
         when 'semana' then date_trunc('week', current_date)
         when 'mes' then date_trunc('month', current_date)
         else '-infinity'::timestamp
       end
     group by p.id`,
    [periodo]
  );

  // Denominador da média por atleta: o elenco ativo inteiro, não só quem já
  // arremessou — assim a equipe só sobe se mais gente treinar.
  const { rows: elenco } = await query(
    `select categoria, count(*)::int as n
     from people
     where role = 'athlete' and status <> 'afastado'
     group by categoria`
  );

  const equipes = ["F", "M"].map((cat) => {
    const doTime = atletas.filter((a) => a.categoria === cat);
    const tentativas = doTime.reduce((n, a) => n + a.tentativas, 0);
    const acertos = doTime.reduce((n, a) => n + a.acertos, 0);
    const ativos = elenco.find((e) => e.categoria === cat)?.n || 0;
    return {
      cat,
      nome: cat === "F" ? "Feminino" : "Masculino",
      tentativas,
      acertos,
      ativos,
      participantes: doTime.length,
      media: ativos ? tentativas / ativos : 0,
      p: pct(acertos, tentativas),
    };
  });
  const [fem, masc] = equipes;
  const lider = fem.media === masc.media ? null : fem.media > masc.media ? "F" : "M";

  let lista;
  if (ordem === "acertos") {
    lista = comPosicao(
      [...atletas].sort((a, b) => b.acertos - a.acertos || a.tentativas - b.tentativas),
      (a) => a.acertos
    );
  } else if (ordem === "aproveitamento") {
    lista = comPosicao(
      atletas
        .filter((a) => a.tentativas >= MIN_APROVEITAMENTO)
        .map((a) => ({ ...a, p: pct(a.acertos, a.tentativas) }))
        .sort((a, b) => b.p - a.p || b.tentativas - a.tentativas),
      (a) => a.p
    );
  } else {
    lista = comPosicao(
      [...atletas].sort((a, b) => b.tentativas - a.tentativas || b.acertos - a.acertos),
      (a) => a.tentativas
    );
  }

  const href = (p, o) => `/ranking?periodo=${p}&ordem=${o}`;
  const labelPeriodo = PERIODOS.find(([p]) => p === periodo)[1].toLowerCase();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Ranking de arremessos</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-5">
        Quem mais treina arremesso nas duas equipes. Conta tudo que foi lançado em{" "}
        <strong>Arremessos</strong>.
      </p>

      <div className="flex gap-1.5 flex-wrap mb-6">
        {PERIODOS.map(([p, label]) => (
          <Link
            key={p}
            href={href(p, ordem)}
            className={`btn btn-small ${periodo === p ? "" : "btn-secondary"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* duelo entre as equipes */}
      <h2 className="text-[13px] uppercase tracking-wide text-[var(--text-muted)] font-display font-semibold mb-3">
        Duelo — Feminino × Masculino
      </h2>
      <div className="card p-4 mb-2">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Lado equipe={fem} lider={lider === "F"} alinhamento="left" />
          <div className="font-display font-bold text-[15px] text-[var(--text-muted)]">×</div>
          <Lado equipe={masc} lider={lider === "M"} alinhamento="right" />
        </div>
        <Placar fem={fem.media} masc={masc.media} />
      </div>
      <p className="text-[11.5px] text-[var(--text-muted)] mb-8">
        O placar é a média de arremessos por atleta do elenco ativo — equipe maior não ganha só por
        ter mais gente. Para subir, mais atletas precisam treinar.
      </p>

      {/* ranking individual */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-[13px] uppercase tracking-wide text-[var(--text-muted)] font-display font-semibold">
          Ranking geral
        </h2>
        <div className="flex gap-1.5 flex-wrap">
          {ORDENS.map(([o, label]) => (
            <Link
              key={o}
              href={href(periodo, o)}
              className={`rounded-full px-3 py-1 text-[12.5px] font-semibold border ${
                ordem === o
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)]"
                  : "bg-[var(--bg-sunken)] text-[var(--text-muted)] border-[var(--border)]"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      {ordem === "aproveitamento" && (
        <p className="text-[11.5px] text-[var(--text-muted)] mb-3">
          Só entra quem fez pelo menos {MIN_APROVEITAMENTO} arremessos {labelPeriodo === "geral" ? "no total" : labelPeriodo}.
        </p>
      )}

      {!lista.length ? (
        <div className="card p-6 text-[13.5px] text-[var(--text-muted)]">
          {ordem === "aproveitamento" && atletas.length
            ? `Ninguém chegou a ${MIN_APROVEITAMENTO} arremessos ${labelPeriodo === "geral" ? "ainda" : labelPeriodo}.`
            : `Nenhum arremesso lançado ${labelPeriodo === "geral" ? "ainda" : labelPeriodo}. Quem começa?`}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {lista.map((a) => {
            const p = pct(a.acertos, a.tentativas);
            const voce = a.id === user.personId;
            const destaque =
              ordem === "acertos"
                ? `${a.acertos}`
                : ordem === "aproveitamento"
                  ? `${p}%`
                  : `${a.tentativas}`;
            return (
              <div
                key={a.id}
                className={`flex items-center gap-3 px-3 py-2.5 border-t first:border-t-0 border-[var(--border)] ${
                  voce ? "bg-[var(--accent-soft)]" : ""
                }`}
              >
                <div className="w-8 shrink-0 text-center font-display font-bold text-[15px] tabular-nums">
                  {a.pos <= 3 ? MEDALHAS[a.pos - 1] : `${a.pos}º`}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13.5px] truncate">
                    {a.nome}
                    {voce && <span className="text-[var(--accent)] font-normal"> · você</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11.5px] text-[var(--text-muted)] tabular-nums">
                    <CategoryTag categoria={a.categoria} />
                    <span>
                      {a.acertos}/{a.tentativas} ·{" "}
                      <span style={{ color: cor(p) }}>{p}%</span> · {a.treinos}{" "}
                      {a.treinos === 1 ? "treino" : "treinos"}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display font-bold text-[20px] text-[var(--accent)] tabular-nums leading-none">
                    {destaque}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mt-1">
                    {ORDENS.find(([o]) => o === ordem)[1]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Lado({ equipe, lider, alinhamento }) {
  const direita = alinhamento === "right";
  return (
    <div className={direita ? "text-right" : ""}>
      <div className={`flex items-center gap-1.5 ${direita ? "justify-end" : ""}`}>
        {lider && !direita && <span title="Na frente">👑</span>}
        <CategoryTag categoria={equipe.cat} />
        {lider && direita && <span title="Na frente">👑</span>}
      </div>
      <div className="font-display font-bold text-[30px] tabular-nums leading-tight mt-1 text-[var(--accent)]">
        {fmt(equipe.media)}
      </div>
      <div className="text-[11px] text-[var(--text-muted)]">arremessos por atleta</div>
      <div className="text-[11.5px] text-[var(--text-muted)] mt-2 tabular-nums">
        {equipe.tentativas} no total · {equipe.p === null ? "—" : `${equipe.p}%`}
        <br />
        {equipe.participantes} de {equipe.ativos} atletas treinaram
      </div>
    </div>
  );
}

// Barra dividida: o lado de cada equipe cresce com a média dela.
function Placar({ fem, masc }) {
  const total = fem + masc;
  const lf = total ? (fem / total) * 100 : 50;
  return (
    <div className="flex h-2 rounded-full overflow-hidden mt-4 bg-[var(--bg-sunken)]">
      <div style={{ width: `${lf}%`, background: "var(--fem)" }} />
      <div style={{ width: `${100 - lf}%`, background: "var(--masc)" }} />
    </div>
  );
}
