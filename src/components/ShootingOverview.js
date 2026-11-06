import Link from "next/link";
import { query } from "@/lib/db";

export const PERIODOS_ACOMPANHAMENTO = [
  ["hoje", "Hoje"],
  ["7d", "7 dias"],
  ["30d", "30 dias"],
  ["geral", "Geral"],
];

function pct(m, a) {
  return a ? Math.round((m / a) * 100) : null;
}

function cor(p) {
  if (p === null) return "var(--text-muted)";
  if (p >= 50) return "var(--success)";
  if (p >= 33) return "var(--warn)";
  return "var(--danger)";
}

function ultimoTreino(dias) {
  if (dias === null) return "nenhum treino registrado";
  if (dias === 0) return "registrou treino hoje";
  if (dias === 1) return "último treino registrado ontem";
  return `último treino registrado há ${dias} dias`;
}

// Visão do técnico: como cada atleta do elenco ativo está treinando
// arremesso — inclusive quem não lançou nada no período, que é quem
// precisa de cobrança. "Último treino" é sempre o mais recente de todos,
// independente do período escolhido.
export default async function ShootingOverview({ periodo, hrefPeriodo }) {
  const { rows } = await query(
    `with ini as (
       select case $1
         when 'hoje' then current_date
         when '7d' then current_date - 6
         when '30d' then current_date - 29
         else '-infinity'::date
       end as d
     )
     select p.id, p.nome, p.categoria,
            coalesce(sum(st.tentativas) filter (where ss.data >= ini.d), 0)::int as tentativas,
            coalesce(sum(st.acertos) filter (where ss.data >= ini.d), 0)::int as acertos,
            (count(distinct st.session_id) filter (where ss.data >= ini.d))::int as treinos,
            (current_date - max(ss.data))::int as dias_desde
     from people p
     cross join ini
     left join shooting_sets st on st.person_id = p.id
     left join shooting_sessions ss on ss.id = st.session_id
     where p.role = 'athlete' and p.status <> 'afastado'
     group by p.id, ini.d
     order by p.nome`,
    [periodo]
  );

  const equipes = ["F", "M"].map((cat) => {
    const atletas = rows
      .filter((a) => a.categoria === cat)
      .sort((a, b) => b.tentativas - a.tentativas || a.nome.localeCompare(b.nome));
    const tentativas = atletas.reduce((n, a) => n + a.tentativas, 0);
    const acertos = atletas.reduce((n, a) => n + a.acertos, 0);
    return {
      cat,
      nome: cat === "F" ? "Feminino" : "Masculino",
      atletas,
      tentativas,
      acertos,
      treinaram: atletas.filter((a) => a.tentativas > 0).length,
    };
  });

  return (
    <div>
      <div className="flex gap-1.5 flex-wrap mb-5">
        {PERIODOS_ACOMPANHAMENTO.map(([p, label]) => (
          <Link
            key={p}
            href={hrefPeriodo(p)}
            className={`btn btn-small ${periodo === p ? "" : "btn-secondary"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {equipes.map((e) => (
          <section key={e.cat}>
            <div className="card p-4 mb-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`tag ${e.cat === "F" ? "tag-fem" : "tag-masc"}`}>{e.nome}</span>
                <span className="text-[11.5px] text-[var(--text-muted)] tabular-nums">
                  {e.treinaram} de {e.atletas.length} treinaram
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <Numero valor={e.tentativas} label="Arremessos" />
                <Numero valor={e.acertos} label="Acertos" />
                <Numero
                  valor={pct(e.acertos, e.tentativas) === null ? "—" : `${pct(e.acertos, e.tentativas)}%`}
                  label="Aproveit."
                  cor={cor(pct(e.acertos, e.tentativas))}
                />
              </div>
            </div>

            <div className="card overflow-hidden">
              {!e.atletas.length && (
                <div className="p-4 text-[13px] italic text-[var(--text-muted)]">
                  Nenhuma atleta ativa nesta equipe.
                </div>
              )}
              {e.atletas.map((a) => {
                const p = pct(a.acertos, a.tentativas);
                const parada = a.tentativas === 0;
                return (
                  <Link
                    key={a.id}
                    href={`/atletas/${a.id}/analise`}
                    className="flex items-center gap-3 px-3 py-2.5 border-t first:border-t-0 border-[var(--border)] hover:bg-[var(--bg-sunken)]"
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-[13.5px] font-semibold truncate ${parada ? "text-[var(--text-muted)]" : ""}`}
                      >
                        {a.nome}
                      </div>
                      <div
                        className="text-[11.5px] mt-0.5"
                        style={{
                          color:
                            a.dias_desde === null || a.dias_desde > 14
                              ? "var(--danger)"
                              : "var(--text-muted)",
                        }}
                      >
                        {ultimoTreino(a.dias_desde)}
                      </div>
                    </div>
                    {parada ? (
                      <span className="shrink-0 text-[11.5px] text-[var(--text-muted)]">
                        sem séries no período
                      </span>
                    ) : (
                      <div className="shrink-0 text-right tabular-nums">
                        <div className="text-[13.5px] font-semibold">
                          {a.acertos}/{a.tentativas}{" "}
                          <span style={{ color: cor(p) }}>{p}%</span>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {a.treinos} {a.treinos === 1 ? "treino" : "treinos"}
                        </div>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Numero({ valor, label, cor: c }) {
  return (
    <div>
      <div
        className="font-display font-bold text-[21px] tabular-nums leading-tight"
        style={{ color: c || "var(--accent)" }}
      >
        {valor}
      </div>
      <div className="text-[10.5px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
    </div>
  );
}
