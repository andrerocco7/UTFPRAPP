import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/components/Guard";
import { query } from "@/lib/db";
import { addNote, deleteAthlete } from "@/app/actions";
import { CategoryTag, StatusTag } from "@/components/Tag";
import { spotLabel } from "@/lib/spots";

export default async function AthleteDetailPage({ params }) {
  await requireAdminPage();
  const { id } = await params;

  const { rows } = await query(
    "select id, nome, email, categoria, curso, posicao, status from people where id = $1 and role = 'athlete'",
    [id]
  );
  const athlete = rows[0];
  if (!athlete) notFound();

  const { rows: notes } = await query(
    "select id, texto, criado_em from notes where person_id = $1 order by criado_em desc",
    [id]
  );

  // Aproveitamento por ponto da quadra, somando todas as series ja lancadas.
  const { rows: porSpot } = await query(
    `select spot,
            sum(acertos)::int as acertos,
            sum(tentativas)::int as tentativas
     from shooting_sets
     where person_id = $1
     group by spot
     order by sum(acertos)::float / nullif(sum(tentativas), 0) asc nulls last`,
    [id]
  );

  // Ultimos treinos, para ver se esta subindo ou caindo.
  const { rows: porData } = await query(
    `select ss.data,
            sum(st.acertos)::int as acertos,
            sum(st.tentativas)::int as tentativas
     from shooting_sets st
     join shooting_sessions ss on ss.id = st.session_id
     where st.person_id = $1
     group by ss.data
     order by ss.data desc
     limit 8`,
    [id]
  );

  const boundAddNote = addNote.bind(null, athlete.id);
  const boundDelete = deleteAthlete.bind(null, athlete.id);

  return (
    <div>
      <Link href="/atletas" className="text-[12.5px] text-[var(--text-muted)] hover:text-[var(--accent)]">
        ← Atletas
      </Link>

      <div className="flex items-start justify-between mt-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{athlete.nome}</h1>
          <div className="text-[13px] text-[var(--text-muted)] mt-1">
            {athlete.email} · {athlete.curso || "Curso não informado"}
            {athlete.posicao ? ` · ${athlete.posicao}` : ""}
          </div>
          <div className="flex gap-2 mt-2">
            <CategoryTag categoria={athlete.categoria} />
            <StatusTag status={athlete.status} />
          </div>
        </div>
        <form action={boundDelete}>
          <button type="submit" className="btn btn-danger btn-small">
            Remover atleta
          </button>
        </form>
      </div>

      <h2 className="text-[13px] uppercase tracking-wide text-[var(--text-muted)] font-display font-semibold mb-3">
        Arremessos
      </h2>
      {!porSpot.length ? (
        <div className="text-[13px] italic text-[var(--text-muted)] mb-8">
          Nenhuma série registrada ainda.
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-8">
          <div className="card overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Ponto</th>
                  <th style={{ textAlign: "right" }}>Acertos</th>
                  <th style={{ textAlign: "right" }}>%</th>
                </tr>
              </thead>
              <tbody>
                {porSpot.map((r) => {
                  const p = Math.round((r.acertos / r.tentativas) * 100);
                  const cor =
                    p >= 50 ? "var(--success)" : p >= 33 ? "var(--warn)" : "var(--danger)";
                  return (
                    <tr key={r.spot}>
                      <td>{spotLabel(r.spot)}</td>
                      <td style={{ textAlign: "right" }}>
                        {r.acertos}/{r.tentativas}
                      </td>
                      <td style={{ textAlign: "right", color: cor, fontWeight: 600 }}>{p}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card p-4">
            <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] mb-3">
              Últimos treinos
            </div>
            <div className="flex items-end gap-2 h-[70px]">
              {porData
                .slice()
                .reverse()
                .map((d) => {
                  const p = Math.round((d.acertos / d.tentativas) * 100);
                  return (
                    <div key={d.data} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[10px] text-[var(--text-muted)] tabular-nums">{p}%</div>
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: `${Math.max(4, p * 0.45)}px`,
                          background: p >= 50 ? "var(--success)" : p >= 33 ? "var(--warn)" : "var(--danger)",
                        }}
                        title={`${d.acertos}/${d.tentativas}`}
                      />
                      <div className="text-[9.5px] text-[var(--text-muted)] tabular-nums">
                        {new Date(d.data).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      <h2 className="text-[13px] uppercase tracking-wide text-[var(--text-muted)] font-display font-semibold mb-3">
        Notas de evolução
      </h2>

      <form action={boundAddNote} className="flex gap-2 mb-5">
        <input
          type="text"
          name="texto"
          placeholder="Nova nota (ex: tendência de erro, evolução técnica)"
          className="flex-1"
        />
        <button type="submit" className="btn btn-small">
          Adicionar
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {!notes.length && (
          <div className="text-[13px] italic text-[var(--text-muted)]">Sem notas ainda.</div>
        )}
        {notes.map((n) => (
          <div key={n.id} className="card p-3">
            <div className="text-[11px] text-[var(--text-muted)] mb-1">
              {new Date(n.criado_em).toLocaleString("pt-BR")}
            </div>
            <div className="text-[13px]">{n.texto}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
