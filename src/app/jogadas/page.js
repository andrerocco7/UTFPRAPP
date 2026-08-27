import { requireSessionPage } from "@/components/Guard";
import { query } from "@/lib/db";
import { addPlay, deletePlay } from "@/app/actions";
import VideoLink from "@/components/VideoLink";

const CATEGORY_LABEL = { F: "Feminino", M: "Masculino", ambos: "Ambos" };
const CATEGORY_CLASS = { F: "tag-fem", M: "tag-masc", ambos: "tag-ativo" };

export default async function PlaysPage() {
  const user = await requireSessionPage();
  const isAdmin = user.role === "admin";

  const { rows: plays } = await query(
    "select id, nome, categoria, situacao, descricao, video_url from plays order by criado_em desc"
  );

  const visible = isAdmin
    ? plays
    : plays.filter((p) => p.categoria === "ambos" || p.categoria === user.categoria);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Jogadas táticas</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-6">Repertório de jogadas por equipe.</p>

      {isAdmin && (
        <div className="card p-5 mb-8">
          <h3 className="font-semibold text-[13.5px] mb-3">Nova jogada</h3>
          <form action={addPlay} className="flex flex-col gap-3">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Nome da jogada">
                <input type="text" name="nome" required placeholder="Ex: Bloqueio duplo lateral" />
              </Field>
              <Field label="Categoria">
                <select name="categoria" defaultValue="ambos">
                  <option value="F">Feminino</option>
                  <option value="M">Masculino</option>
                  <option value="ambos">Ambos os times</option>
                </select>
              </Field>
            </div>
            <Field label="Quando usar">
              <input type="text" name="situacao" placeholder="Ex: contra defesa zona 2-3, últimos segundos" />
            </Field>
            <Field label="Descrição / execução">
              <textarea name="descricao" placeholder="Passo a passo da jogada" />
            </Field>
            <Field label="Link de vídeo (YouTube/Vimeo) — opcional">
              <input type="url" name="video_url" placeholder="https://..." />
            </Field>
            <button type="submit" className="btn self-start">
              Adicionar jogada
            </button>
          </form>
        </div>
      )}

      {!visible.length && (
        <div className="text-[13px] italic text-[var(--text-muted)]">
          Nenhuma jogada cadastrada ainda.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {visible.map((p) => {
          const boundDelete = deletePlay.bind(null, p.id);
          return (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className={`tag ${CATEGORY_CLASS[p.categoria]} mr-2`}>
                    {CATEGORY_LABEL[p.categoria]}
                  </span>
                  <span className="font-display font-semibold text-[14.5px]">{p.nome}</span>
                </div>
                {isAdmin && (
                  <form action={boundDelete} className="shrink-0">
                    <button type="submit" className="text-[var(--text-muted)] hover:text-[var(--danger)]" title="Remover">
                      ✕
                    </button>
                  </form>
                )}
              </div>
              {p.situacao && (
                <div className="text-[12px] text-[var(--text-muted)] mt-2">
                  Quando usar: {p.situacao}
                </div>
              )}
              {p.descricao && <p className="text-[13px] mt-1.5">{p.descricao}</p>}
              <VideoLink url={p.video_url} />
            </div>
          );
        })}
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
