import Link from "next/link";
import { requireCoachPage } from "@/components/Guard";
import { query } from "@/lib/db";
import { addCoordinator, removeCoordinator } from "@/app/actions";
import AddAthleteForm from "@/components/AddAthleteForm";
import { CategoryTag } from "@/components/Tag";
import StatusSelect from "@/components/StatusSelect";

export default async function AthletesPage() {
  const user = await requireCoachPage();

  const { rows: athletes } = await query(
    "select id, nome, email, categoria, curso, posicao, status, coordena from people where role = 'athlete' order by nome"
  );
  // Afastadas vão para o fim da lista de cada equipe.
  const porStatus = (a, b) => (a.status === "afastado") - (b.status === "afastado");
  const fem = athletes.filter((a) => a.categoria === "F").sort(porStatus);
  const masc = athletes.filter((a) => a.categoria === "M").sort(porStatus);

  // Coordenação = atletas com a flag ligada. As demais (com equipe definida)
  // são as candidatas que aparecem no seletor.
  const coordinators = athletes.filter((a) => a.coordena);
  const candidates = athletes.filter((a) => !a.coordena && a.categoria);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Atletas</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-6">
        Ficha de cada atleta, feminino e masculino. O e-mail cadastrado precisa ser o
        institucional da UTFPR — é com ele que a atleta faz login. Atleta externa (sem e-mail
        UTFPR): cadastre sem e-mail e gere o link dela na ficha. Mude o status direto na lista:
        <strong> afastada</strong> sai do lançamento de séries, do ranking e da conta das metas da
        equipe, sem perder o histórico.
      </p>

      <AddAthleteForm />

      <AthleteGroup title="Feminino" categoria="F" list={fem} isAdmin={user.role === "admin"} />
      <AthleteGroup title="Masculino" categoria="M" list={masc} isAdmin={user.role === "admin"} />

      {/* Coordenação mexe no acesso ao Financeiro e mostra e-mails: só o técnico. */}
      {user.role === "admin" && (
        <CoordinatorSection coordinators={coordinators} candidates={candidates} />
      )}
    </div>
  );
}

function CoordinatorSection({ coordinators, candidates }) {
  return (
    <div className="mb-8">
      <h2 className="text-[15px] font-display font-semibold mb-3">Coordenação do financeiro</h2>
      <p className="text-[12.5px] text-[var(--text-muted)] mb-3">
        A atleta escolhida continua no elenco normalmente — só passa a enxergar o Financeiro
        da própria equipe. Marque quantas quiser por equipe.
      </p>

      <div className="card p-5 mb-4">
        <h3 className="font-semibold text-[13.5px] mb-3">Dar acesso à coordenação</h3>
        {!candidates.length ? (
          <div className="text-[13px] italic text-[var(--text-muted)]">
            Todas as atletas com equipe definida já estão na coordenação.
          </div>
        ) : (
          <form action={addCoordinator} className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
            <Field label="Atleta">
              <select name="personId" required defaultValue="">
                <option value="" disabled>
                  Selecione uma atleta
                </option>
                {candidates.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome} — {a.categoria === "F" ? "Feminino" : "Masculino"}
                  </option>
                ))}
              </select>
            </Field>
            <button type="submit" className="btn">
              Dar acesso
            </button>
          </form>
        )}
      </div>

      {!coordinators.length ? (
        <div className="text-[13px] italic text-[var(--text-muted)]">
          Nenhuma atleta na coordenação ainda.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {coordinators.map((c) => {
            const boundRemove = removeCoordinator.bind(null, c.id);
            return (
              <div key={c.id} className="card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-display font-semibold text-[14.5px]">{c.nome}</div>
                  <div className="text-[12px] text-[var(--text-muted)] truncate">{c.email}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <CategoryTag categoria={c.categoria} />
                  <form action={boundRemove}>
                    <button
                      type="submit"
                      title="Tirar da coordenação (mantém a atleta no elenco)"
                      className="text-[var(--text-muted)] hover:text-[var(--danger)] px-1"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AthleteGroup({ title, categoria, list, isAdmin }) {
  const ativos = list.filter((a) => a.status !== "afastado").length;
  return (
    <div className="mb-8">
      <h2 className="text-[15px] font-display font-semibold mb-3 flex items-center gap-2">
        <CategoryTag categoria={categoria} />
        <span>
          {ativos} ativas
          {list.length > ativos && (
            <span className="text-[var(--text-muted)] font-normal"> · {list.length - ativos} afastadas</span>
          )}
        </span>
      </h2>
      {!list.length && (
        <div className="text-[13px] italic text-[var(--text-muted)]">
          Nenhuma atleta cadastrada ainda.
        </div>
      )}
      <div className="flex flex-col gap-2">
        {list.map((a) => (
          <div
            key={a.id}
            className={`card p-3 pl-4 flex items-center justify-between gap-3 ${
              a.status === "afastado" ? "opacity-60" : ""
            }`}
          >
            <Link href={`/atletas/${a.id}`} className="min-w-0 flex-1 hover:text-[var(--accent)]">
              <div className="font-display font-semibold text-[14.5px] truncate">
                {a.nome}
                {!a.email && (
                  <span className="ml-1.5 align-middle rounded-full border border-[var(--border)] px-1.5 py-px text-[10.5px] font-sans font-medium text-[var(--text-muted)]">
                    externa
                  </span>
                )}
              </div>
              <div className="text-[12px] text-[var(--text-muted)] truncate">
                {a.curso || "Curso não informado"}
                {a.posicao ? ` · ${a.posicao}` : ""}
              </div>
            </Link>
            <div className="shrink-0 flex items-center gap-2">
              {isAdmin && !a.email && (
                <Link
                  href={`/acessos?atleta=${a.id}`}
                  className="btn btn-secondary btn-small whitespace-nowrap"
                  title="Gerar um novo link de acesso para esta atleta externa"
                >
                  Link
                </Link>
              )}
              <StatusSelect personId={a.id} status={a.status} />
            </div>
          </div>
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
