import Link from "next/link";
import { requireSessionPage } from "@/components/Guard";
import { CategoryTag } from "@/components/Tag";
import { TIPOS_META, MULTIPLICADOR_EXTRA, fmtPontos } from "@/lib/metas";
import { carregarMetas, resolverSemana, fmtDia, somaDias } from "@/lib/metasSemana";
import { Titulo, Barra, VelocimetrosEquipes, SuaSemana, Top3 } from "@/components/MetasBlocos";

export default async function MetasPage({ searchParams }) {
  const user = await requireSessionPage();
  const params = await searchParams;

  const { semana, semanaAtual } = await resolverSemana(params.semana);
  const { resultado, equipes, lider, top3 } = await carregarMetas(semana);

  const eu = user.role === "athlete" ? resultado.find((a) => a.id === user.personId) : null;
  const ehAtual = semana === semanaAtual;

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
          {fmtDia(semana)} a {fmtDia(somaDias(semana, 6))}
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

      <VelocimetrosEquipes equipes={equipes} lider={lider} />

      {eu && <SuaSemana eu={eu} />}

      {/* regra */}
      <details className="card p-4 mb-8 text-[13px]">
        <summary className="font-semibold cursor-pointer">
          Como funciona — meta de cada atleta, toda semana
        </summary>
        <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
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
      </details>

      {/* por tipo */}
      <Titulo>Por tipo de arremesso</Titulo>
      <div className="grid md:grid-cols-2 gap-3 mb-2">
        {equipes.map((e) => (
          <div key={e.cat} className={`card p-4 ${lider === e.cat ? "border-[var(--accent)]" : ""}`}>
            <span className="flex items-center gap-1.5">
              {lider === e.cat && <span title="Na frente">👑</span>}
              <CategoryTag categoria={e.cat} />
            </span>
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
        Em média, quanto da meta de cada tipo a equipe já fez.
      </p>

      <Top3
        top3={top3}
        userId={user.personId}
        vazio={`Ninguém lançou arremessos ${ehAtual ? "ainda esta semana" : "nesta semana"}. O pódio está vazio — quem começa?`}
      />

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
