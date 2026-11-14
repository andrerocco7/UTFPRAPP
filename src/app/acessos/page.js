import { requireAdminPage } from "@/components/Guard";
import { query } from "@/lib/db";
import { revokeAccessLink } from "@/app/actions";
import NewAccessLinkForm from "@/components/NewAccessLinkForm";

function fmt(d) {
  return d
    ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "—";
}

// Só o técnico gera e desativa links — se a comissão pudesse, um link
// revogado poderia ter gerado outro antes.
export default async function AccessLinksPage({ searchParams }) {
  await requireAdminPage();
  const { atleta } = await searchParams;

  const { rows: links } = await query(
    `select l.id, l.nome, l.criado_em, l.expira_em, l.revogado_em, l.ultimo_uso, l.person_id,
            (l.revogado_em is null and (l.expira_em is null or l.expira_em > now())) as ativo
     from access_links l
     order by ativo desc, l.criado_em desc`
  );

  const { rows: atletas } = await query(
    `select id, nome, categoria, (email is null) as externa
     from people where role = 'athlete' order by nome`
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Acessos</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-2">
        Links para entrar no painel sem conta Google. <strong>Comissão técnica</strong> age como
        técnico — cadastra atletas, lança séries, edita treinos, escalação e jogadas — mas não vê
        e-mails das atletas, notas individuais nem o Financeiro. <strong>Atleta externa</strong>{" "}
        (treina com o time e não tem e-mail da UTFPR) entra como ela mesma, e o link pode ser sem
        prazo.
      </p>
      <p className="text-[12.5px] text-[var(--danger)] mb-6">
        Quem tiver o link entra: mande só para quem precisa e desative quando não precisar mais.
      </p>

      <NewAccessLinkForm atletas={atletas} atletaInicial={Number(atleta) || null} />

      {!links.length ? (
        <div className="text-[13px] italic text-[var(--text-muted)]">Nenhum link criado ainda.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {links.map((l) => {
            const boundRevoke = revokeAccessLink.bind(null, l.id);
            const status = l.revogado_em ? "Desativado" : l.ativo ? "Ativo" : "Expirado";
            return (
              <div
                key={l.id}
                className={`card p-4 flex items-center justify-between gap-3 ${l.ativo ? "" : "opacity-60"}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-[14.5px] truncate">{l.nome}</span>
                    <span className={`tag ${l.ativo ? "tag-ativo" : "tag-afastado"}`}>{status}</span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {l.person_id ? "atleta" : "comissão"}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-[var(--text-muted)] mt-1 tabular-nums">
                    Criado {fmt(l.criado_em)} ·{" "}
                    {l.revogado_em
                      ? `desativado ${fmt(l.revogado_em)}`
                      : !l.expira_em
                        ? "sem prazo"
                        : `${l.ativo ? "vale até" : "expirou"} ${fmt(l.expira_em)}`}{" "}
                    · última entrada {fmt(l.ultimo_uso)}
                  </div>
                </div>
                {l.ativo && (
                  <form action={boundRevoke} className="shrink-0">
                    <button type="submit" className="btn btn-danger btn-small">
                      Desativar
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
