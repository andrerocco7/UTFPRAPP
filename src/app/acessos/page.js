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
export default async function AccessLinksPage() {
  await requireAdminPage();

  const { rows: links } = await query(
    `select id, nome, criado_em, expira_em, revogado_em, ultimo_uso,
            (revogado_em is null and expira_em > now()) as ativo
     from access_links
     order by (revogado_em is null and expira_em > now()) desc, criado_em desc`
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Acessos</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-2">
        Links para a comissão técnica entrar no painel sem conta Google. Quem entra por link age
        como técnico — cadastra atletas, lança séries, edita treinos, escalação e jogadas — mas{" "}
        <strong>não vê</strong> e-mails das atletas, notas individuais nem o Financeiro, e não mexe
        na coordenação nem nos links.
      </p>
      <p className="text-[12.5px] text-[var(--danger)] mb-6">
        Quem tiver o link entra: mande só para quem precisa e desative quando não precisar mais.
      </p>

      <NewAccessLinkForm />

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
                  </div>
                  <div className="text-[11.5px] text-[var(--text-muted)] mt-1 tabular-nums">
                    Criado {fmt(l.criado_em)} ·{" "}
                    {l.revogado_em
                      ? `desativado ${fmt(l.revogado_em)}`
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
