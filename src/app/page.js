import { auth } from "@/auth";
import { query } from "@/lib/db";

export default async function OverviewPage() {
  const session = await auth();
  const isAdmin = session.user.role === "admin";

  const { rows: competitions } = await query(
    "select id, nome, periodo, historico_f, historico_m from competitions order by id"
  );

  let stats = null;
  if (isAdmin) {
    const { rows } = await query(
      `select
         count(*) filter (where role = 'athlete' and categoria = 'F') as fem,
         count(*) filter (where role = 'athlete' and categoria = 'M') as masc,
         count(*) filter (where role = 'athlete' and status in ('observacao','lesionado')) as atencao
       from people`
    );
    const { rows: playRows } = await query("select count(*)::int as total from plays");
    stats = { ...rows[0], jogadas: playRows[0].total };
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Visão geral</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-6">
        {isAdmin
          ? "Resumo das duas equipes."
          : `Bem-vindo(a), ${session.user.nome || session.user.name?.split(" ")[0]}.`}
      </p>

      {isAdmin && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard num={stats.fem} label="Atletas — Feminino" />
          <StatCard num={stats.masc} label="Atletas — Masculino" />
          <StatCard num={stats.atencao} label="Em observação / lesionados" />
          <StatCard num={stats.jogadas} label="Jogadas cadastradas" />
        </div>
      )}

      <h2 className="text-[13px] uppercase tracking-wide text-[var(--text-muted)] font-display font-semibold mb-3">
        Competições do ano
      </h2>
      <div className="grid md:grid-cols-3 gap-3 mb-8">
        {competitions.map((c) => (
          <div key={c.id} className="card p-4">
            <h3 className="font-display font-semibold text-[15px]">{c.nome}</h3>
            <div className="text-[12px] text-[var(--text-muted)] mt-1 mb-2">
              {c.periodo || "Período a definir"}
            </div>
            <div className="text-[12.5px] mt-1">
              <span className="tag tag-fem mr-1">Fem</span>
              {c.historico_f || "—"}
            </div>
            <div className="text-[12.5px] mt-2">
              <span className="tag tag-masc mr-1">Masc</span>
              {c.historico_m || "—"}
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-[13px] uppercase tracking-wide text-[var(--text-muted)] font-display font-semibold mb-3">
        Cronograma semanal
      </h2>
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
