import Link from "next/link";
import { requireSessionPage } from "@/components/Guard";
import { query } from "@/lib/db";
import { CategoryTag } from "@/components/Tag";
import {
  TIPOS_META,
  META_TOTAL,
  MULTIPLICADOR_EXTRA,
  tipoDoSpot,
  pontuar,
  fmtPontos,
} from "@/lib/metas";

const SEMANAS_HISTORICO = 6;
const MEDALHAS = ["🥇", "🥈", "🥉"];
const EQUIPES = [
  { cat: "F", nome: "Feminino", curto: "Fem", cor: "var(--fem)" },
  { cat: "M", nome: "Masculino", curto: "Masc", cor: "var(--masc)" },
];

// Datas vêm do banco como texto 'YYYY-MM-DD' para não passar por fuso.
function fmtDia(iso) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function somaDias(iso, dias) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export default async function MetasPage({ searchParams }) {
  const user = await requireSessionPage();
  const params = await searchParams;

  const { rows: hojeRows } = await query(
    "select to_char(date_trunc('week', current_date), 'YYYY-MM-DD') as atual"
  );
  const semanaAtual = hojeRows[0].atual;
  // Semana escolhida: sempre uma segunda-feira, nunca no futuro.
  const pedida = /^\d{4}-\d{2}-\d{2}$/.test(params.semana || "") ? params.semana : semanaAtual;
  const { rows: semRows } = await query(
    "select to_char(date_trunc('week', least($1::date, current_date)), 'YYYY-MM-DD') as semana",
    [pedida]
  );
  const semana = semRows[0].semana;
  const inicioHistorico = somaDias(semana, -7 * (SEMANAS_HISTORICO - 1));

  // Conta só o elenco ativo: afastadas não puxam a média da equipe para baixo
  // nem entram no top 3.
  const { rows: atletas } = await query(
    `select id, nome, categoria from people
     where role = 'athlete' and status <> 'afastado' and categoria in ('F', 'M')
     order by nome`
  );

  const { rows: series } = await query(
    `select st.person_id, st.spot, st.tentativas,
            to_char(date_trunc('week', ss.data), 'YYYY-MM-DD') as semana
     from shooting_sets st
     join shooting_sessions ss on ss.id = st.session_id
     join people p on p.id = st.person_id
     where p.role = 'athlete' and p.status <> 'afastado'
       and ss.data >= $1::date and ss.data < $2::date + 7`,
    [inicioHistorico, semana]
  );

  // contagens[semana][personId][tipo] = arremessos
  const contagens = {};
  for (const s of series) {
    const tipo = tipoDoSpot(s.spot);
    if (!tipo) continue;
    contagens[s.semana] ??= {};
    contagens[s.semana][s.person_id] ??= {};
    contagens[s.semana][s.person_id][tipo] =
      (contagens[s.semana][s.person_id][tipo] || 0) + s.tentativas;
  }

  const daSemana = (sem) =>
    atletas.map((a) => ({ ...a, ...pontuar(contagens[sem]?.[a.id] || {}) }));

  const resultado = daSemana(semana);

  const equipes = EQUIPES.map((e) => {
    const lista = resultado.filter((a) => a.categoria === e.cat);
    const n = lista.length;
    const soma = (f) => lista.reduce((t, a) => t + f(a), 0);
    return {
      ...e,
      lista: [...lista].sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome)),
      ativos: n,
      media: n ? soma((a) => a.pontos) / n : 0,
      progresso: n ? soma((a) => a.base) / (n * META_TOTAL) : 0,
      bateramTudo: lista.filter((a) => a.metasBatidas === TIPOS_META.length).length,
      treinaram: lista.filter((a) => a.pontos > 0).length,
      porTipo: TIPOS_META.map((t, i) => ({
        ...t,
        // média do que cada atleta fez daquele tipo, limitado à meta
        progresso: n ? soma((a) => a.porTipo[i].base) / (n * t.meta) : 0,
        bateram: lista.filter((a) => a.porTipo[i].bateu).length,
      })),
    };
  });
  const [fem, masc] = equipes;
  const lider = fem.media === masc.media ? null : fem.media > masc.media ? "F" : "M";

  const top = resultado
    .filter((a) => a.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome));
  let pos = 0;
  let anterior = null;
  const ranqueados = top.map((a, i) => {
    if (a.pontos !== anterior) {
      pos = i + 1;
      anterior = a.pontos;
    }
    return { ...a, pos };
  });
  const top3 = ranqueados.filter((a) => a.pos <= 3);

  const historico = Array.from({ length: SEMANAS_HISTORICO }, (_, i) => {
    const sem = somaDias(inicioHistorico, 7 * i);
    const r = daSemana(sem);
    return {
      semana: sem,
      equipes: EQUIPES.map((e) => {
        const l = r.filter((a) => a.categoria === e.cat);
        return { ...e, media: l.length ? l.reduce((t, a) => t + a.pontos, 0) / l.length : 0 };
      }),
    };
  });

  const eu = user.role === "athlete" ? resultado.find((a) => a.id === user.personId) : null;
  const ehAtual = semana === semanaAtual;
  const fimSemana = somaDias(semana, 6);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Metas da semana</h1>
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <Link
          href={`/metas?semana=${somaDias(semana, -7)}`}
          className="btn btn-secondary btn-small"
          aria-label="Semana anterior"
        >
          ←
        </Link>
        <span className="text-[13.5px] font-semibold tabular-nums">
          {fmtDia(semana)} a {fmtDia(fimSemana)}
          {ehAtual && <span className="text-[var(--accent)]"> · semana atual</span>}
        </span>
        {!ehAtual && (
          <Link
            href={`/metas?semana=${somaDias(semana, 7)}`}
            className="btn btn-secondary btn-small"
            aria-label="Próxima semana"
          >
            →
          </Link>
        )}
      </div>

      {/* regra */}
      <div className="card p-4 mb-6 text-[13px]">
        <div className="font-semibold mb-1">Meta de cada atleta, toda semana</div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {TIPOS_META.map((t) => (
            <span
              key={t.tipo}
              className="rounded-full border border-[var(--accent)] text-[var(--accent)] px-2.5 py-0.5 text-[12.5px] font-semibold"
            >
              {t.meta} {t.label === "Lance livre" ? "lances livres" : `arremessos de ${t.label}`}
            </span>
          ))}
        </div>
        <div className="text-[12.5px] text-[var(--text-muted)]">
          Cada arremesso feito vale <strong className="text-[var(--text)]">1 ponto</strong> até a
          meta daquele tipo. Passou da meta, cada arremesso extra vale{" "}
          <strong className="text-[var(--accent)]">
            {fmtPontos(MULTIPLICADOR_EXTRA)} ponto{MULTIPLICADOR_EXTRA === 1 ? "" : "s"}
          </strong>
          . O placar das equipes é a média de pontos por atleta ativa. Vale tudo que foi lançado
          em <strong className="text-[var(--text)]">Arremessos</strong>, de segunda a domingo.
        </div>
      </div>

      {/* minha semana */}
      {eu && (
        <section className="mb-8">
          <Titulo>Sua semana</Titulo>
          <div className="card p-4">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <div>
                <span className="font-display font-bold text-[30px] text-[var(--accent)] tabular-nums">
                  {fmtPontos(eu.pontos)}
                </span>
                <span className="text-[12px] text-[var(--text-muted)]"> pontos</span>
              </div>
              <div className="text-[12.5px] text-[var(--text-muted)] text-right">
                {eu.metasBatidas === TIPOS_META.length
                  ? "Bateu as 3 metas — agora cada arremesso vale mais 🔥"
                  : `${eu.metasBatidas} de ${TIPOS_META.length} metas batidas`}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {eu.porTipo.map((t) => (
                <Medidor key={t.tipo} t={t} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* duelo */}
      <Titulo>Duelo — Feminino × Masculino</Titulo>
      <div className="grid md:grid-cols-2 gap-3 mb-2">
        {equipes.map((e) => (
          <div
            key={e.cat}
            className={`card p-4 ${lider === e.cat ? "border-[var(--accent)]" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                {lider === e.cat && <span title="Na frente">👑</span>}
                <CategoryTag categoria={e.cat} />
              </span>
              <span className="text-[11.5px] text-[var(--text-muted)] tabular-nums">
                {e.treinaram} de {e.ativos} treinaram
              </span>
            </div>
            <div className="mt-2">
              <span className="font-display font-bold text-[34px] text-[var(--accent)] tabular-nums leading-none">
                {fmtPontos(e.media)}
              </span>
              <span className="text-[12px] text-[var(--text-muted)]"> pontos por atleta</span>
            </div>
            <div className="text-[12px] text-[var(--text-muted)] mt-1 tabular-nums">
              {e.bateramTudo} {e.bateramTudo === 1 ? "atleta bateu" : "atletas bateram"} as 3 metas
            </div>

            <div className="flex flex-col gap-2 mt-4">
              {e.porTipo.map((t) => (
                <div key={t.tipo}>
                  <div className="flex justify-between text-[11.5px] tabular-nums">
                    <span>{t.label}</span>
                    <span className="text-[var(--text-muted)]">
                      {Math.round(t.progresso * 100)}% da meta · {t.bateram} bateram
                    </span>
                  </div>
                  <Barra frac={t.progresso} cor={e.cor} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11.5px] text-[var(--text-muted)] mb-8">
        As barras mostram, em média, quanto da meta de cada tipo a equipe já fez. Equipe maior não
        ganha só por ter mais gente: o placar divide pelo elenco ativo.
      </p>

      {/* top 3 */}
      <Titulo>Top 3 arremessadores da semana</Titulo>
      {!top3.length ? (
        <div className="card p-6 text-[13.5px] text-[var(--text-muted)] mb-8">
          Ninguém lançou arremessos {ehAtual ? "ainda esta semana" : "nesta semana"}. O pódio está
          vazio — quem começa?
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-3 mb-8">
          {top3.map((a) => (
            <div
              key={a.id}
              className={`card p-4 ${a.id === user.personId ? "bg-[var(--accent-soft)]" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[26px] leading-none">{MEDALHAS[a.pos - 1]}</span>
                <div className="min-w-0">
                  <div className="font-display font-semibold text-[15px] truncate">
                    {a.nome}
                    {a.id === user.personId && (
                      <span className="text-[var(--accent)] font-normal"> · você</span>
                    )}
                  </div>
                  <CategoryTag categoria={a.categoria} />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-display font-bold text-[26px] text-[var(--accent)] tabular-nums">
                  {fmtPontos(a.pontos)}
                </span>
                <span className="text-[12px] text-[var(--text-muted)]"> pontos</span>
              </div>
              <div className="text-[11.5px] text-[var(--text-muted)] tabular-nums mt-1">
                {a.porTipo.map((t) => `${t.feitos} ${t.curto}`).join(" · ")}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* evolução */}
      <Titulo>Últimas {SEMANAS_HISTORICO} semanas — pontos por atleta</Titulo>
      <div className="card p-4 mb-8">
        <div className="flex gap-4 text-[12px] mb-2">
          {EQUIPES.map((e) => (
            <span key={e.cat} className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: e.cor }} />
              {e.nome}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <span className="inline-block w-3 border-t border-[var(--text-muted)]" />
            meta ({META_TOTAL})
          </span>
        </div>
        <Historico historico={historico} semanaSelecionada={semana} />
        <details className="mt-3">
          <summary className="text-[12px] text-[var(--text-muted)] cursor-pointer">
            Ver como tabela
          </summary>
          <table className="mt-2">
            <thead>
              <tr>
                <th>Semana</th>
                {EQUIPES.map((e) => (
                  <th key={e.cat} style={{ textAlign: "right" }}>
                    {e.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historico.map((h) => (
                <tr key={h.semana}>
                  <td className="tabular-nums">{fmtDia(h.semana)}</td>
                  {h.equipes.map((e) => (
                    <td key={e.cat} style={{ textAlign: "right" }} className="tabular-nums">
                      {fmtPontos(e.media)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>

      {/* todas */}
      <Titulo>Todas as atletas</Titulo>
      <div className="grid md:grid-cols-2 gap-4">
        {equipes.map((e) => (
          <div key={e.cat} className="card overflow-hidden">
            <div className="px-3 pt-3 pb-2 flex items-center justify-between">
              <CategoryTag categoria={e.cat} />
              <span className="text-[11px] text-[var(--text-muted)]">LL · 3pts · 2pts</span>
            </div>
            {!e.lista.length && (
              <div className="px-3 pb-3 text-[13px] italic text-[var(--text-muted)]">
                Nenhuma atleta ativa.
              </div>
            )}
            {e.lista.map((a) => (
              <div
                key={a.id}
                className={`px-3 py-2 border-t border-[var(--border)] ${
                  a.id === user.personId ? "bg-[var(--accent-soft)]" : ""
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`text-[13px] font-semibold truncate ${a.pontos ? "" : "text-[var(--text-muted)]"}`}
                  >
                    {a.nome}
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums shrink-0">
                    {fmtPontos(a.pontos)} pts
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {a.porTipo.map((t) => (
                    <div key={t.tipo} title={`${t.label}: ${t.feitos} de ${t.meta}`}>
                      <Barra frac={t.base / t.meta} cor={t.bateu ? "var(--success)" : e.cor} fina />
                      <div className="text-[10.5px] text-[var(--text-muted)] tabular-nums mt-0.5">
                        {t.feitos}/{t.meta}
                        {t.bateu && " ✓"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Titulo({ children }) {
  return (
    <h2 className="text-[13px] uppercase tracking-wide text-[var(--text-muted)] font-display font-semibold mb-3">
      {children}
    </h2>
  );
}

function Barra({ frac, cor, fina }) {
  const w = Math.max(0, Math.min(1, frac)) * 100;
  return (
    <div
      className={`${fina ? "h-1.5" : "h-2"} rounded-full bg-[var(--bg-sunken)] mt-1 overflow-hidden`}
    >
      {w > 0 && <div className="h-full rounded-full" style={{ width: `${w}%`, background: cor }} />}
    </div>
  );
}

function Medidor({ t }) {
  return (
    <div>
      <div className="flex justify-between items-baseline text-[12.5px] tabular-nums">
        <span className="font-semibold">{t.label}</span>
        <span>
          <strong>{t.feitos}</strong>
          <span className="text-[var(--text-muted)]"> / {t.meta}</span>
          {t.bateu ? (
            <span className="text-[var(--success)] font-semibold">
              {" "}
              ✓ meta batida{t.extra > 0 && ` · +${t.extra} extras`}
            </span>
          ) : (
            <span className="text-[var(--text-muted)]"> · faltam {t.meta - t.feitos}</span>
          )}
        </span>
      </div>
      <Barra frac={t.base / t.meta} cor={t.bateu ? "var(--success)" : "var(--accent)"} />
    </div>
  );
}

// Colunas agrupadas por semana (Fem e Masc), com a linha da meta. SVG puro.
function Historico({ historico, semanaSelecionada }) {
  const W = 420;
  const H = 200;
  const PAD_L = 30;
  const PAD_B = 22;
  const PAD_T = 14;
  const maxDado = Math.max(...historico.flatMap((h) => h.equipes.map((e) => e.media)));
  const topo = Math.ceil((Math.max(META_TOTAL, maxDado) * 1.12) / 50) * 50;
  const y = (v) => PAD_T + (H - PAD_T - PAD_B) * (1 - v / topo);
  const slot = (W - PAD_L - 4) / historico.length;
  const BAR = Math.min(22, slot / 3);
  const GAP = 2;

  // topo arredondado 4px, base reta
  const barra = (x, v) => {
    const y0 = y(0);
    const y1 = y(v);
    const h = y0 - y1;
    if (h <= 0) return null;
    const r = Math.min(4, h, BAR / 2);
    return `M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + BAR - r} Q${x + BAR},${y1} ${x + BAR},${y1 + r} V${y0} Z`;
  };

  const ticks = [0, topo / 2, topo];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label="Pontos por atleta de cada equipe nas últimas semanas">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD_L} x2={W} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="1" />
            <text x={PAD_L - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">
              {t}
            </text>
          </g>
        ))}
        <line x1={PAD_L} x2={W} y1={y(META_TOTAL)} y2={y(META_TOTAL)} stroke="var(--text-muted)"
          strokeWidth="1" />
        <text x={W - 2} y={y(META_TOTAL) - 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">
          meta
        </text>

        {historico.map((h, i) => {
          const cx = PAD_L + slot * i + slot / 2;
          const x0 = cx - BAR - GAP / 2;
          const sel = h.semana === semanaSelecionada;
          return (
            <g key={h.semana}>
              {h.equipes.map((e, j) => {
                const d = barra(x0 + j * (BAR + GAP), e.media);
                return (
                  <g key={e.cat}>
                    {/* alvo de hover maior que a barra */}
                    <rect x={x0 + j * (BAR + GAP)} y={PAD_T} width={BAR} height={H - PAD_T - PAD_B}
                      fill="transparent">
                      <title>{`${e.nome}, semana de ${fmtDia(h.semana)}: ${fmtPontos(e.media)} pontos por atleta`}</title>
                    </rect>
                    {d && (
                      <path d={d} fill={e.cor} opacity={sel ? 1 : 0.55} pointerEvents="none" />
                    )}
                  </g>
                );
              })}
              <text x={cx} y={H - 6} textAnchor="middle" fontSize="11.5"
                fill={sel ? "var(--text)" : "var(--text-muted)"} fontWeight={sel ? 600 : 400}>
                {fmtDia(h.semana)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
