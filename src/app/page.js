import Link from "next/link";
import { isCoach } from "@/lib/roles";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { CategoryTag } from "@/components/Tag";
import { COLOCACAO } from "@/lib/trofeus";
import { carregarMetas, resolverSemana, fmtDia, somaDias } from "@/lib/metasSemana";
import { Titulo, VelocimetrosEquipes, SuaSemana, Top3 } from "@/components/MetasBlocos";

export default async function OverviewPage() {
  const session = await auth();
  const user = session.user;
  const isAdmin = isCoach(user);

  const { semana } = await resolverSemana(null);
  const { resultado, equipes, lider, top3 } = await carregarMetas(semana);
  const eu = user.role === "athlete" ? resultado.find((a) => a.id === user.personId) : null;

  // Vitrine da sala de troféus: os títulos mais recentes.
  const { rows: trofeus } = await query(
    `select id, competicao, ano, categoria, colocacao, detalhe,
            count(*) filter (where colocacao = 'campeao') over () as total_titulos
     from titles
     order by ano desc, case colocacao when 'campeao' then 0 when 'vice' then 1 else 2 end
     limit 4`
  );

  let stats = null;
  if (isAdmin) {
    const { rows } = await query(
      `select
         count(*) filter (where categoria = 'F' and status <> 'afastado')::int as fem,
         count(*) filter (where categoria = 'M' and status <> 'afastado')::int as masc,
         count(*) filter (where status in ('observacao','lesionado'))::int as atencao,
         count(*) filter (where status = 'afastado')::int as afastadas
       from people where role = 'athlete'`
    );
    stats = rows[0];
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Visão geral</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-6">
        {isAdmin
          ? "Como as duas equipes estão nas metas desta semana."
          : `Bem-vindo(a), ${(user.nome || user.name || "").split(" ")[0]}.`}
      </p>

      {/* metas da semana */}
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <Titulo>
          Metas da semana · {fmtDia(semana)} a {fmtDia(somaDias(semana, 6))}
        </Titulo>
        <Link href="/metas" className="text-[12.5px] text-[var(--accent)] shrink-0">
          Ver detalhes →
        </Link>
      </div>
      <VelocimetrosEquipes equipes={equipes} lider={lider} />

      {eu && <SuaSemana eu={eu} />}

      <Top3
        top3={top3}
        userId={user.personId}
        vazio="Ninguém lançou arremessos ainda esta semana. O pódio está vazio — quem começa?"
      />

      {/* sala de troféus */}
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <Titulo>Sala de troféus</Titulo>
        <Link href="/trofeus" className="text-[12.5px] text-[var(--accent)] shrink-0">
          Ver todos →
        </Link>
      </div>
      {!trofeus.length ? (
        <Link href="/trofeus" className="card p-6 block text-[13.5px] text-[var(--text-muted)] mb-8">
          A sala de troféus ainda está vazia.
        </Link>
      ) : (
        <Link href="/trofeus" className="card p-4 block mb-8 hover:border-[var(--accent)] transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[34px] leading-none" aria-hidden="true">
              🏆
            </span>
            <div>
              <div className="font-display font-bold text-[24px] text-[var(--accent)] tabular-nums leading-none">
                {trofeus[0].total_titulos} {Number(trofeus[0].total_titulos) === 1 ? "título" : "títulos"}
              </div>
              <div className="text-[12px] text-[var(--text-muted)]">conquistados pelas duas equipes</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {trofeus.map((t) => (
              <div key={t.id} className="rounded-lg bg-[var(--bg-sunken)] p-2.5">
                <div className="text-[20px] leading-none" aria-hidden="true">
                  {COLOCACAO[t.colocacao].icone}
                </div>
                <div className="text-[12.5px] font-semibold leading-tight mt-1.5 line-clamp-2">
                  {t.competicao}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[var(--text-muted)] tabular-nums">
                  {t.ano} <CategoryTag categoria={t.categoria} />
                </div>
              </div>
            ))}
          </div>
        </Link>
      )}

      {/* elenco (técnico) */}
      {isAdmin && stats && (
        <>
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <Titulo>Elenco</Titulo>
            <Link href="/atletas" className="text-[12.5px] text-[var(--accent)] shrink-0">
              Gerenciar →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatCard num={stats.fem} label="Ativas — Feminino" />
            <StatCard num={stats.masc} label="Ativos — Masculino" />
            <StatCard num={stats.atencao} label="Em observação / lesionados" />
            <StatCard num={stats.afastadas} label="Afastados" />
          </div>
        </>
      )}

      <Titulo>Cronograma semanal</Titulo>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="card p-4">
          <span className="tag tag-fem">Feminino</span>
          <div className="text-[12.5px] text-[var(--text-muted)] mt-2">
            Segunda, quarta e sábado
          </div>
        </div>
        <div className="card p-4">
          <span className="tag tag-masc">Masculino</span>
          <div className="text-[12.5px] text-[var(--text-muted)] mt-2">Segunda e sexta</div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ num, label }) {
  return (
    <div className="card p-4">
      <div className="font-display font-bold text-[28px] text-[var(--accent)] tabular-nums">
        {num}
      </div>
      <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5">{label}</div>
    </div>
  );
}
