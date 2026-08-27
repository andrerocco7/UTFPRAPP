import { requireAdminPage } from "@/components/Guard";
import { query } from "@/lib/db";
import { createSquad, deleteSquad, toggleSquadMember, setCutReason } from "@/app/actions";
import { CategoryTag } from "@/components/Tag";

export default async function SquadsPage() {
  await requireAdminPage();

  const { rows: competitions } = await query("select id, nome from competitions order by id");
  const { rows: squads } = await query(
    "select id, competition_id, categoria, ano from squads order by ano desc, id desc"
  );
  const { rows: athletes } = await query(
    "select id, nome, categoria from people where role = 'athlete' order by nome"
  );
  const { rows: members } = await query(
    "select squad_id, person_id, convocado, motivo_corte from squad_members"
  );

  const compById = Object.fromEntries(competitions.map((c) => [c.id, c.nome]));
  const membersBySquad = {};
  members.forEach((m) => {
    membersBySquad[m.squad_id] = membersBySquad[m.squad_id] || {};
    membersBySquad[m.squad_id][m.person_id] = m;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Escalação</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-6">
        Monte a lista de convocados por competição e registre os cortes.
      </p>

      <div className="card p-5 mb-8">
        <h3 className="font-semibold text-[13.5px] mb-3">Nova escalação</h3>
        <form action={createSquad} className="grid md:grid-cols-4 gap-3 items-end">
          <Field label="Competição">
            <select name="competicao">
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Categoria">
            <select name="categoria">
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
            </select>
          </Field>
          <Field label="Ano">
            <input type="number" name="ano" defaultValue={new Date().getFullYear()} />
          </Field>
          <button type="submit" className="btn">
            Criar escalação
          </button>
        </form>
      </div>

      {!squads.length && (
        <div className="text-[13px] italic text-[var(--text-muted)]">
          Nenhuma escalação criada ainda.
        </div>
      )}

      {squads.map((sq) => {
        const pool = athletes.filter((a) => a.categoria === sq.categoria);
        const boundDelete = deleteSquad.bind(null, sq.id);
        return (
          <div key={sq.id} className="card p-5 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="font-display font-semibold text-[16px]">
                {compById[sq.competition_id]} — <CategoryTag categoria={sq.categoria} /> {sq.ano}
              </h3>
              <form action={boundDelete}>
                <button type="submit" className="text-[var(--text-muted)] hover:text-[var(--danger)]" title="Remover">
                  ✕
                </button>
              </form>
            </div>

            {!pool.length ? (
              <div className="text-[13px] italic text-[var(--text-muted)]">
                Cadastre atletas dessa categoria na aba Atletas primeiro.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Atleta</th>
                      <th>Convocada(o)</th>
                      <th>Motivo do corte (se não convocado)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pool.map((a) => {
                      const m = membersBySquad[sq.id]?.[a.id];
                      const boundToggle = toggleSquadMember.bind(null, sq.id, a.id, !m?.convocado);
                      const boundCut = setCutReason.bind(null, sq.id, a.id);
                      return (
                        <tr key={a.id}>
                          <td>{a.nome}</td>
                          <td>
                            <form action={boundToggle}>
                              <button
                                type="submit"
                                className={`tag ${m?.convocado ? "tag-ativo" : "tag-afastado"}`}
                              >
                                {m?.convocado ? "Convocada" : "Não convocada"}
                              </button>
                            </form>
                          </td>
                          <td>
                            <form action={boundCut} className="flex gap-1.5">
                              <input
                                type="text"
                                name="motivo"
                                defaultValue={m?.motivo_corte || ""}
                                placeholder="—"
                                disabled={!!m?.convocado}
                              />
                              {!m?.convocado && (
                                <button type="submit" className="btn btn-secondary btn-small shrink-0">
                                  Salvar
                                </button>
                              )}
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
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
