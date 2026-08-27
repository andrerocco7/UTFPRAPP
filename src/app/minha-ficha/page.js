import { redirect } from "next/navigation";
import { requireSessionPage } from "@/components/Guard";
import { query } from "@/lib/db";
import { CategoryTag, StatusTag } from "@/components/Tag";

export default async function MyProfilePage() {
  const user = await requireSessionPage();
  if (user.role !== "athlete") redirect("/");

  const { rows: peopleRows } = await query(
    "select id, nome, email, categoria, curso, posicao, status from people where id = $1",
    [user.personId]
  );
  const me = peopleRows[0];

  const { rows: notes } = await query(
    "select id, texto, criado_em from notes where person_id = $1 order by criado_em desc",
    [user.personId]
  );

  const { rows: squadRows } = await query(
    `select s.id, s.ano, c.nome as competicao, sm.convocado, sm.motivo_corte
     from squad_members sm
     join squads s on s.id = sm.squad_id
     join competitions c on c.id = s.competition_id
     where sm.person_id = $1
     order by s.ano desc`,
    [user.personId]
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Minha ficha</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-6">
        Suas informações e o que o técnico anotou sobre sua evolução.
      </p>

      <div className="card p-5 mb-6">
        <div className="font-display font-semibold text-[16px]">{me.nome}</div>
        <div className="text-[12.5px] text-[var(--text-muted)] mt-1">
          {me.email} · {me.curso || "Curso não informado"}
          {me.posicao ? ` · ${me.posicao}` : ""}
        </div>
        <div className="flex gap-2 mt-2">
          <CategoryTag categoria={me.categoria} />
          <StatusTag status={me.status} />
        </div>
      </div>

      <h2 className="text-[13px] uppercase tracking-wide text-[var(--text-muted)] font-display font-semibold mb-3">
        Notas do técnico
      </h2>
      <div className="flex flex-col gap-2 mb-8">
        {!notes.length && (
          <div className="text-[13px] italic text-[var(--text-muted)]">Sem notas ainda.</div>
        )}
        {notes.map((n) => (
          <div key={n.id} className="card p-3">
            <div className="text-[11px] text-[var(--text-muted)] mb-1">
              {new Date(n.criado_em).toLocaleDateString("pt-BR")}
            </div>
            <div className="text-[13px]">{n.texto}</div>
          </div>
        ))}
      </div>

      <h2 className="text-[13px] uppercase tracking-wide text-[var(--text-muted)] font-display font-semibold mb-3">
        Escalação
      </h2>
      <div className="flex flex-col gap-2">
        {!squadRows.length && (
          <div className="text-[13px] italic text-[var(--text-muted)]">
            Nenhuma escalação registrada ainda.
          </div>
        )}
        {squadRows.map((s) => (
          <div key={s.id} className="card p-3 flex items-center justify-between gap-3">
            <div className="text-[13px] min-w-0">
              {s.competicao} — {s.ano}
            </div>
            <span className={`shrink-0 tag ${s.convocado ? "tag-ativo" : "tag-afastado"}`}>
              {s.convocado ? "Convocada(o)" : "Não convocada(o)"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
