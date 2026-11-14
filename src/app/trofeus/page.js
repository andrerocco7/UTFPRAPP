import Link from "next/link";
import { requireSessionPage } from "@/components/Guard";
import { query } from "@/lib/db";
import { isCoach } from "@/lib/roles";
import { addTitle, deleteTitle } from "@/app/actions";
import { CategoryTag } from "@/components/Tag";
import { COLOCACAO } from "@/lib/trofeus";


const FILTROS = [
  ["todas", "As duas equipes"],
  ["F", "Feminino"],
  ["M", "Masculino"],
];

export default async function TrophyRoomPage({ searchParams }) {
  const user = await requireSessionPage();
  const podeEditar = isCoach(user);
  const { equipe } = await searchParams;
  const filtro = ["F", "M"].includes(equipe) ? equipe : "todas";

  const { rows: todos } = await query(
    `select id, competicao, ano, categoria, colocacao, detalhe
     from titles
     order by ano desc,
              case colocacao when 'campeao' then 0 when 'vice' then 1 else 2 end,
              competicao`
  );
  const { rows: competicoes } = await query("select nome from competitions order by nome");

  const titulos = filtro === "todas" ? todos : todos.filter((t) => t.categoria === filtro);
  const conta = (cat, col) =>
    todos.filter((t) => (!cat || t.categoria === cat) && t.colocacao === col).length;

  // Uma prateleira por ano, do mais recente para o mais antigo.
  const anos = [...new Set(titulos.map((t) => t.ano))];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Sala de troféus</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-6">
        Os títulos e pódios do Basquete UTFPR, feminino e masculino.
      </p>

      {/* placar de títulos */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Contador icone="🏆" valor={conta(null, "campeao")} label="títulos" destaque />
        <Contador icone="🏆" valor={conta("F", "campeao")} label="do feminino" />
        <Contador icone="🏆" valor={conta("M", "campeao")} label="do masculino" />
      </div>

      <div className="flex gap-1.5 flex-wrap mb-6">
        {FILTROS.map(([v, l]) => (
          <Link
            key={v}
            href={v === "todas" ? "/trofeus" : `/trofeus?equipe=${v}`}
            className={`btn btn-small ${filtro === v ? "" : "btn-secondary"}`}
          >
            {l}
          </Link>
        ))}
      </div>

      {podeEditar && (
        <details className="card p-4 mb-8">
          <summary className="font-semibold text-[13.5px] cursor-pointer">Adicionar título</summary>
          <form action={addTitle} className="grid md:grid-cols-3 gap-3 mt-3">
            <Field label="Competição">
              <input
                type="text"
                name="competicao"
                required
                list="competicoes"
                placeholder="Ex: Engenhariadas Paranaense"
              />
              <datalist id="competicoes">
                {competicoes.map((c) => (
                  <option key={c.nome} value={c.nome} />
                ))}
              </datalist>
            </Field>
            <Field label="Ano">
              <input type="number" name="ano" required min="1950" max="2100" placeholder="2026" />
            </Field>
            <Field label="Equipe">
              <select name="categoria" defaultValue="F">
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
              </select>
            </Field>
            <Field label="Colocação">
              <select name="colocacao" defaultValue="campeao">
                {Object.entries(COLOCACAO).map(([v, c]) => (
                  <option key={v} value={v}>
                    {c.icone} {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Detalhe (opcional)">
              <input type="text" name="detalhe" placeholder="Ex: Série ouro, invicto, bicampeonato" />
            </Field>
            <div className="flex items-end">
              <button type="submit" className="btn">
                Adicionar
              </button>
            </div>
          </form>
        </details>
      )}

      {!anos.length ? (
        <div className="card p-6 text-[13.5px] text-[var(--text-muted)]">
          {todos.length
            ? "Nenhum título dessa equipe cadastrado ainda."
            : "A sala de troféus ainda está vazia."}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {anos.map((ano) => (
            <section key={ano}>
              <div className="font-display font-bold text-[22px] text-[var(--accent)] tabular-nums mb-2">
                {ano}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {titulos
                  .filter((t) => t.ano === ano)
                  .map((t) => (
                    <Trofeu key={t.id} t={t} podeEditar={podeEditar} />
                  ))}
              </div>
              {/* a prateleira */}
              <div
                className="h-2.5 mt-2 rounded-sm"
                style={{
                  background: "linear-gradient(var(--accent-soft), var(--bg-sunken))",
                  boxShadow: "0 4px 10px rgba(0,0,0,.45)",
                }}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Trofeu({ t, podeEditar }) {
  const c = COLOCACAO[t.colocacao];
  const boundDelete = deleteTitle.bind(null, t.id);
  return (
    <div
      className={`card relative p-4 pt-5 text-center flex flex-col items-center ${
        t.colocacao === "campeao" ? "border-[var(--accent)]" : ""
      }`}
    >
      {podeEditar && (
        <form action={boundDelete} className="absolute top-1.5 right-1.5">
          <button
            type="submit"
            title="Remover título"
            className="text-[var(--text-muted)] hover:text-[var(--danger)] px-1 text-[12px]"
          >
            ✕
          </button>
        </form>
      )}
      <div
        className={`leading-none mb-2 ${t.colocacao === "campeao" ? "text-[52px]" : "text-[40px]"}`}
        style={t.colocacao === "campeao" ? { filter: "drop-shadow(0 0 14px rgba(255,204,0,.35))" } : {}}
        aria-hidden="true"
      >
        {c.icone}
      </div>
      <div
        className={`text-[11px] uppercase tracking-wide font-semibold ${
          t.colocacao === "campeao" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
        }`}
      >
        {c.label}
      </div>
      <div className="font-display font-semibold text-[14px] leading-tight mt-1">{t.competicao}</div>
      {t.detalhe && <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5">{t.detalhe}</div>}
      <div className="mt-2">
        <CategoryTag categoria={t.categoria} />
      </div>
    </div>
  );
}

function Contador({ icone, valor, label, destaque }) {
  return (
    <div className={`card p-4 text-center ${destaque ? "border-[var(--accent)]" : ""}`}>
      <div className="text-[22px] leading-none" aria-hidden="true">
        {icone}
      </div>
      <div className="font-display font-bold text-[28px] text-[var(--accent)] tabular-nums leading-tight mt-1">
        {valor}
      </div>
      <div className="text-[11.5px] text-[var(--text-muted)]">{label}</div>
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
