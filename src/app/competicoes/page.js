import { requireSessionPage } from "@/components/Guard";
import { query } from "@/lib/db";
import { updateCompetition } from "@/app/actions";

export default async function CompetitionsPage() {
  const user = await requireSessionPage();
  const isAdmin = user.role === "admin";

  const { rows } = await query(
    "select id, nome, periodo, regras, historico_f, historico_m from competitions order by id"
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Competições</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-6">
        As 3 competições principais do ano — histórico e regras.
      </p>

      {rows.map((c) => (
        <CompetitionCard key={c.id} c={c} isAdmin={isAdmin} />
      ))}
    </div>
  );
}

function CompetitionCard({ c, isAdmin }) {
  const boundUpdate = updateCompetition.bind(null, c.id);

  return (
    <div className="card p-5 mb-4">
      <h2 className="font-display font-semibold text-[17px]">{c.nome}</h2>

      {isAdmin ? (
        <form action={boundUpdate} className="mt-3 flex flex-col gap-3">
          <Field label="Período">
            <input type="text" name="periodo" defaultValue={c.periodo} />
          </Field>
          <Field label="Regras / elegibilidade">
            <textarea name="regras" defaultValue={c.regras} />
          </Field>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Histórico — Feminino">
              <textarea name="historico_f" defaultValue={c.historico_f} />
            </Field>
            <Field label="Histórico — Masculino">
              <textarea name="historico_m" defaultValue={c.historico_m} />
            </Field>
          </div>
          <button type="submit" className="btn btn-small self-start">
            Salvar
          </button>
        </form>
      ) : (
        <div className="mt-3 text-[13px]">
          <div className="text-[12.5px] text-[var(--text-muted)] mb-2">
            {c.periodo || "Período a definir"}
          </div>
          {c.regras && <p className="mb-3">{c.regras}</p>}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <span className="tag tag-fem">Feminino</span>
              <p className="mt-1.5">{c.historico_f || "—"}</p>
            </div>
            <div>
              <span className="tag tag-masc">Masculino</span>
              <p className="mt-1.5">{c.historico_m || "—"}</p>
            </div>
          </div>
        </div>
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
