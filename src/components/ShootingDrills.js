import { query } from "@/lib/db";
import { addShootingDrill, deleteShootingDrill } from "@/app/actions";
import { SPOTS, spotLabel } from "@/lib/spots";
import VideoLink from "@/components/VideoLink";

const CATEGORY_LABEL = { F: "Feminino", M: "Masculino", ambos: "As duas equipes" };
const CATEGORY_CLASS = { F: "tag-fem", M: "tag-masc", ambos: "tag-ativo" };

// Biblioteca de exercícios de arremesso. O técnico cadastra e remove; a
// atleta vê os da própria equipe e os marcados para as duas.
export default async function ShootingDrills({ isAdmin, categoria }) {
  const { rows } = await query(
    `select id, nome, categoria, objetivo, descricao, video_url, pontos
     from shooting_drills
     where $1::text is null or categoria = 'ambos' or categoria = $1
     order by criado_em desc`,
    [isAdmin ? null : categoria || "ambos"]
  );

  return (
    <div>
      <p className="text-[13px] text-[var(--text-muted)] mb-5">
        {isAdmin
          ? "Exercícios de arremesso para o time fazer — cada atleta vê os da própria equipe."
          : "Exercícios de arremesso sugeridos pelo técnico. Faça e lance as séries na aba Lançar séries."}
      </p>

      {isAdmin && (
        <div className="card p-5 mb-6">
          <h3 className="font-semibold text-[13.5px] mb-3">Novo exercício</h3>
          <form action={addShootingDrill} className="flex flex-col gap-3">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Nome do exercício">
                <input type="text" name="nome" required placeholder="Ex: Volta ao mundo dos 3 pontos" />
              </Field>
              <Field label="Para qual equipe">
                <select name="categoria" defaultValue="ambos">
                  <option value="ambos">As duas equipes</option>
                  <option value="F">Feminino</option>
                  <option value="M">Masculino</option>
                </select>
              </Field>
            </div>
            <Field label="Objetivo">
              <input
                type="text"
                name="objetivo"
                placeholder="Ex: arremesso após recepção em movimento, sob cansaço"
              />
            </Field>
            <Field label="Como fazer">
              <textarea
                name="descricao"
                placeholder="Passo a passo: séries, quantos arremessos por ponto, descanso, meta de acertos..."
              />
            </Field>
            <fieldset>
              <legend className="text-[11.5px] text-[var(--text-muted)] mb-1.5">
                Pontos da quadra trabalhados (opcional)
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {SPOTS.map((s) => (
                  <label
                    key={s.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] px-2.5 py-1 text-[12.5px] cursor-pointer has-[:checked]:border-[var(--accent)] has-[:checked]:text-[var(--accent)]"
                  >
                    <input type="checkbox" name="pontos" value={s.id} className="accent-[var(--accent)]" />
                    {s.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Link do vídeo (YouTube, Vimeo, Instagram, Drive) — opcional">
              <input type="url" name="video_url" placeholder="https://..." />
            </Field>
            <button type="submit" className="btn self-start">
              Adicionar exercício
            </button>
          </form>
        </div>
      )}

      {!rows.length ? (
        <div className="card p-6 text-[13.5px] text-[var(--text-muted)]">
          {isAdmin
            ? "Nenhum exercício cadastrado ainda."
            : "O técnico ainda não cadastrou exercícios de arremesso."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((d) => {
            const boundDelete = deleteShootingDrill.bind(null, d.id);
            return (
              <div key={d.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display font-semibold text-[16px]">{d.nome}</div>
                    <span className={`tag ${CATEGORY_CLASS[d.categoria]} mt-1 inline-block`}>
                      {CATEGORY_LABEL[d.categoria]}
                    </span>
                  </div>
                  {isAdmin && (
                    <form action={boundDelete} className="shrink-0">
                      <button
                        type="submit"
                        title="Remover exercício"
                        className="text-[var(--text-muted)] hover:text-[var(--danger)] px-1"
                      >
                        ✕
                      </button>
                    </form>
                  )}
                </div>
                {d.objetivo && (
                  <div className="text-[12.5px] text-[var(--text-muted)] mt-2">
                    <span className="font-semibold">Objetivo:</span> {d.objetivo}
                  </div>
                )}
                {d.pontos?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {d.pontos.map((p) => (
                      <span
                        key={p}
                        className="rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] px-2 py-0.5 text-[11.5px] text-[var(--text-muted)]"
                      >
                        {spotLabel(p)}
                      </span>
                    ))}
                  </div>
                )}
                {d.descricao && (
                  <p className="text-[13px] mt-2.5 whitespace-pre-wrap">{d.descricao}</p>
                )}
                <VideoLink url={d.video_url} />
              </div>
            );
          })}
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
