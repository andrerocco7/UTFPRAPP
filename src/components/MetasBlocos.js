import { CategoryTag } from "@/components/Tag";
import Gauge from "@/components/Gauge";
import { TIPOS_META, META_TOTAL, MULTIPLICADOR_EXTRA, fmtPontos } from "@/lib/metas";

// Blocos das metas semanais, usados na Visão geral e na página Metas.

const MEDALHAS = ["🥇", "🥈", "🥉"];

export function Titulo({ children }) {
  return (
    <h2 className="text-[13px] uppercase tracking-wide text-[var(--text-muted)] font-display font-semibold mb-3">
      {children}
    </h2>
  );
}

export function Barra({ frac, cor, fina }) {
  const w = Math.max(0, Math.min(1, frac)) * 100;
  return (
    <div
      className={`${fina ? "h-1.5" : "h-2"} rounded-full bg-[var(--bg-sunken)] mt-1 overflow-hidden`}
    >
      {w > 0 && <div className="h-full rounded-full" style={{ width: `${w}%`, background: cor }} />}
    </div>
  );
}

// Um velocímetro por equipe, com o placar e a coroa de quem lidera.
export function VelocimetrosEquipes({ equipes, lider }) {
  return (
    <>
      <div className="grid md:grid-cols-2 gap-3 mb-3">
        {equipes.map((e) => (
          <div key={e.cat} className={`card p-4 ${lider === e.cat ? "border-[var(--accent)]" : ""}`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="flex items-center gap-1.5">
                {lider === e.cat && <span title="Na frente no placar">👑</span>}
                <CategoryTag categoria={e.cat} />
              </span>
              <span className="text-[12px] tabular-nums">
                <strong className="text-[var(--accent)]">{fmtPontos(e.media)}</strong>
                <span className="text-[var(--text-muted)]"> pts por atleta</span>
              </span>
            </div>
            <Gauge
              feito={e.feitoMeta}
              meta={e.metaEquipe}
              cor={e.cor}
              titulo={`Meta da semana — ${e.nome}`}
            />
            <div className="text-center text-[11.5px] text-[var(--text-muted)] mt-1 tabular-nums">
              {e.treinaram} de {e.ativos} treinaram · {e.bateramTudo}{" "}
              {e.bateramTudo === 1 ? "bateu" : "bateram"} as 3 metas
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11.5px] text-[var(--text-muted)] mb-6">
        O ponteiro mostra quanto da meta semanal da equipe já foi feito: {META_TOTAL} arremessos por
        atleta ativa. O 👑 vai para quem tem mais pontos por atleta — quem passa da meta soma{" "}
        {fmtPontos(MULTIPLICADOR_EXTRA)}× nos extras.
      </p>
    </>
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

// Velocímetro pessoal + as três barras da atleta logada.
export function SuaSemana({ eu }) {
  return (
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
        <div className="grid md:grid-cols-[240px_1fr] gap-4 items-center">
          <Gauge
            feito={eu.base}
            meta={META_TOTAL}
            cor="var(--accent)"
            titulo="Sua meta da semana"
            tamanho="sm"
          />
          <div className="flex flex-col gap-3">
            {eu.porTipo.map((t) => (
              <Medidor key={t.tipo} t={t} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Top3({ top3, userId, vazio }) {
  return (
    <>
      <Titulo>Top 3 arremessadores da semana</Titulo>
      {!top3.length ? (
        <div className="card p-6 text-[13.5px] text-[var(--text-muted)] mb-8">{vazio}</div>
      ) : (
        <div className="grid md:grid-cols-3 gap-3 mb-8">
          {top3.map((a) => (
            <div
              key={a.id}
              className={`card p-4 ${a.id === userId ? "bg-[var(--accent-soft)]" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[26px] leading-none">{MEDALHAS[a.pos - 1]}</span>
                <div className="min-w-0">
                  <div className="font-display font-semibold text-[15px] truncate">
                    {a.nome}
                    {a.id === userId && (
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
    </>
  );
}
