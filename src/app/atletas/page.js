import Link from "next/link";
import { requireAdminPage } from "@/components/Guard";
import { query } from "@/lib/db";
import { addAthlete } from "@/app/actions";
import { CategoryTag, StatusTag } from "@/components/Tag";

export default async function AthletesPage() {
  await requireAdminPage();

  const { rows: athletes } = await query(
    "select id, nome, email, categoria, curso, posicao, status from people where role = 'athlete' order by nome"
  );
  const fem = athletes.filter((a) => a.categoria === "F");
  const masc = athletes.filter((a) => a.categoria === "M");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Atletas</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-6">
        Ficha de cada atleta, feminino e masculino. O e-mail cadastrado precisa ser o
        institucional da UTFPR — é com ele que a atleta faz login.
      </p>

      <div className="card p-5 mb-8">
        <h3 className="font-semibold text-[13.5px] mb-3">Adicionar atleta</h3>
        <form action={addAthlete} className="grid md:grid-cols-3 gap-3">
          <Field label="Nome">
            <input type="text" name="nome" required />
          </Field>
          <Field label="E-mail institucional">
            <input type="email" name="email" required placeholder="nome@alunos.utfpr.edu.br" />
          </Field>
          <Field label="Categoria">
            <select name="categoria" defaultValue="F">
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
            </select>
          </Field>
          <Field label="Curso">
            <input type="text" name="curso" placeholder="Ex: Engenharia Civil" />
          </Field>
          <Field label="Posição">
            <input type="text" name="posicao" placeholder="Ex: Armadora, Ala-pivô" />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue="ativo">
              <option value="ativo">Ativo</option>
              <option value="observacao">Em observação</option>
              <option value="lesionado">Lesionado</option>
              <option value="afastado">Afastado</option>
            </select>
          </Field>
          <div className="md:col-span-3">
            <button type="submit" className="btn">
              Adicionar atleta
            </button>
          </div>
        </form>
      </div>

      <AthleteGroup title="Feminino" categoria="F" list={fem} />
      <AthleteGroup title="Masculino" categoria="M" list={masc} />
    </div>
  );
}

function AthleteGroup({ title, categoria, list }) {
  return (
    <div className="mb-8">
      <h2 className="text-[15px] font-display font-semibold mb-3">
        <CategoryTag categoria={categoria} /> <span className="ml-1">({list.length})</span>
      </h2>
      {!list.length && (
        <div className="text-[13px] italic text-[var(--text-muted)]">
          Nenhuma atleta cadastrada ainda.
        </div>
      )}
      <div className="flex flex-col gap-2">
        {list.map((a) => (
          <Link
            key={a.id}
            href={`/atletas/${a.id}`}
            className="card p-4 flex items-center justify-between hover:border-[var(--accent)] transition-colors"
          >
            <div>
              <div className="font-display font-semibold text-[14.5px]">{a.nome}</div>
              <div className="text-[12px] text-[var(--text-muted)]">
                {a.curso || "Curso não informado"}
                {a.posicao ? ` · ${a.posicao}` : ""}
              </div>
            </div>
            <StatusTag status={a.status} />
          </Link>
        ))}
      </div>
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
