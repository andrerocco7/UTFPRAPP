import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoachPage } from "@/components/Guard";
import { query } from "@/lib/db";
import { addNote, deleteAthlete, updateAthlete } from "@/app/actions";
import { CategoryTag, StatusTag } from "@/components/Tag";
import ShootingHistory from "@/components/ShootingHistory";

export default async function AthleteDetailPage({ params }) {
  const user = await requireCoachPage();
  // E-mail e notas individuais são dados sensíveis: a comissão técnica (staff)
  // vê a ficha sem eles — as notas nem são buscadas.
  const isAdmin = user.role === "admin";
  const { id } = await params;

  const { rows } = await query(
    "select id, nome, email, categoria, curso, posicao, status from people where id = $1 and role = 'athlete'",
    [id]
  );
  const athlete = rows[0];
  if (!athlete) notFound();

  const { rows: notes } = isAdmin
    ? await query(
        "select id, texto, criado_em from notes where person_id = $1 order by criado_em desc",
        [id]
      )
    : { rows: [] };

  const boundAddNote = addNote.bind(null, athlete.id);
  const boundDelete = deleteAthlete.bind(null, athlete.id);
  const boundUpdate = updateAthlete.bind(null, athlete.id);

  return (
    <div>
      <Link href="/atletas" className="text-[12.5px] text-[var(--text-muted)] hover:text-[var(--accent)]">
        ← Atletas
      </Link>

      <div className="flex items-start justify-between mt-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{athlete.nome}</h1>
          <div className="text-[13px] text-[var(--text-muted)] mt-1">
            {isAdmin && `${athlete.email} · `}
            {athlete.curso || "Curso não informado"}
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

      <details className="card mb-8 group">
        <summary className="cursor-pointer select-none px-4 py-3 text-[13px] font-semibold">
          Editar dados da atleta
        </summary>
        <form action={boundUpdate} className="grid md:grid-cols-3 gap-3 px-4 pb-4">
          <Field label="Nome">
            <input type="text" name="nome" required defaultValue={athlete.nome} />
          </Field>
          <Field label="Equipe">
            <select name="categoria" defaultValue={athlete.categoria || "F"}>
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
            </select>
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={athlete.status}>
              <option value="ativo">Ativo</option>
              <option value="observacao">Em observação</option>
              <option value="lesionado">Lesionado</option>
              <option value="afastado">Afastado</option>
            </select>
          </Field>
          <Field label="Curso">
            <input type="text" name="curso" defaultValue={athlete.curso || ""} />
          </Field>
          <Field label="Posição">
            <input type="text" name="posicao" defaultValue={athlete.posicao || ""} />
          </Field>
          <div className="flex items-end">
            <button type="submit" className="btn">
              Salvar
            </button>
          </div>
        </form>
      </details>

      <ShootingHistory personId={athlete.id} analiseHref={`/atletas/${athlete.id}/analise`} />

      {isAdmin && (
        <>
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
        </>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-[11.5px] text-[var(--text-muted)]">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
