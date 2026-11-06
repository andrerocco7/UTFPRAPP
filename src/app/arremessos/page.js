import { isCoach } from "@/lib/roles";
import Link from "next/link";
import { requireSessionPage } from "@/components/Guard";
import { query } from "@/lib/db";
import CourtChart from "@/components/CourtChart";
import ShootingOverview, { PERIODOS_ACOMPANHAMENTO } from "@/components/ShootingOverview";
import ShootingDrills from "@/components/ShootingDrills";

const DICA_REPETIR =
  "Pode tocar no mesmo ponto de novo quantas vezes quiser — cada toque soma uma série nova, não substitui a anterior.";

export default async function ShootingPage({ searchParams }) {
  const user = await requireSessionPage();
  const isAdmin = isCoach(user);
  const params = await searchParams;

  // O técnico abre no acompanhamento da equipe; a atleta, direto na quadra
  // dela. Exercícios é aba para os dois.
  const abas = isAdmin
    ? [
        ["acompanhar", "Acompanhamento"],
        ["lancar", "Lançar séries"],
        ["exercicios", "Exercícios"],
      ]
    : [
        ["lancar", "Lançar séries"],
        ["exercicios", "Exercícios"],
      ];
  const aba = abas.some(([a]) => a === params.aba) ? params.aba : abas[0][0];
  const periodo = PERIODOS_ACOMPANHAMENTO.some(([p]) => p === params.periodo)
    ? params.periodo
    : "30d";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Arremessos</h1>

      <div className="flex gap-1 mb-5 border-b border-[var(--border)] overflow-x-auto">
        {abas.map(([a, label]) => (
          <Aba
            key={a}
            href={a === "acompanhar" ? `/arremessos?periodo=${periodo}` : `/arremessos?aba=${a}`}
            ativa={aba === a}
          >
            {label}
          </Aba>
        ))}
      </div>

      {aba === "exercicios" ? (
        <ShootingDrills isAdmin={isAdmin} categoria={user.categoria} />
      ) : aba === "acompanhar" ? (
        <>
          <p className="text-[13px] text-[var(--text-muted)] mb-5">
            Como cada atleta está treinando arremesso, incluindo quem não lançou nada no período.
            Toque no nome para abrir a análise completa.
          </p>
          <ShootingOverview
            periodo={periodo}
            hrefPeriodo={(p) => `/arremessos?periodo=${p}`}
          />
        </>
      ) : (
        <Lancar user={user} isAdmin={isAdmin} />
      )}
    </div>
  );
}

async function Lancar({ user, isAdmin }) {
  // Técnico lança para qualquer atleta ativa; a atleta só para si mesma.
  const { rows: atletas } = isAdmin
    ? await query(
        `select id, nome, categoria
         from people
         where role = 'athlete' and status <> 'afastado'
         order by nome`
      )
    : await query(
        "select id, nome, categoria from people where id = $1 and role = 'athlete'",
        [user.personId]
      );

  // Só as séries de hoje — o histórico completo vive na ficha do atleta.
  const { rows: sets } = await query(
    `select st.id, st.person_id, st.spot, st.tentativas, st.acertos, p.nome
     from shooting_sets st
     join shooting_sessions ss on ss.id = st.session_id
     join people p on p.id = st.person_id
     where ss.data = current_date
       and ($1::int is null or st.person_id = $1)
     order by st.criado_em desc`,
    [isAdmin ? null : user.personId]
  );

  return (
    <>
      <p className="text-[13px] text-[var(--text-muted)] mb-6">
        {isAdmin
          ? "Escolha o atleta, toque no ponto e marque quantos ele acertou na série."
          : "Toque no ponto da quadra e marque quantos você acertou na série."}{" "}
        {DICA_REPETIR}
      </p>
      <CourtChart
        atletas={atletas}
        sets={sets}
        isAdmin={isAdmin}
        categoriaInicial={isAdmin ? "M" : atletas[0]?.categoria}
      />
    </>
  );
}

function Aba({ href, ativa, children }) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-[13.5px] font-semibold -mb-px border-b-2 whitespace-nowrap ${
        ativa
          ? "border-[var(--accent)] text-[var(--text)]"
          : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
      }`}
    >
      {children}
    </Link>
  );
}
