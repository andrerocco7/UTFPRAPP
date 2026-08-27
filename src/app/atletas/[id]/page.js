import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/components/Guard";
import { query } from "@/lib/db";
import { addNote, deleteAthlete } from "@/app/actions";
import { CategoryTag, StatusTag } from "@/components/Tag";

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
