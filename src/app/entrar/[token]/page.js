import Image from "next/image";
import { query } from "@/lib/db";
import { hashToken } from "@/lib/accessLinks";
import { entrarComLink } from "@/app/actions";

// Pública (ver auth.config.js). Não entra sozinha ao abrir: WhatsApp e afins
// abrem o link para montar a prévia, e isso não pode criar sessão.
export default async function EntrarPage({ params, searchParams }) {
  const { token } = await params;
  const { erro } = await searchParams;

  const { rows } = await query(
    `select nome, expira_em, person_id from access_links
     where token_hash = $1 and revogado_em is null and (expira_em is null or expira_em > now())`,
    [hashToken(decodeURIComponent(token))]
  );
  const link = rows[0];
  const boundEntrar = entrarComLink.bind(null, decodeURIComponent(token));

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <Image
          src="/logo-utfpr.svg"
          alt="Emblema Basquete UTFPR"
          width={72}
          height={72}
          className="mx-auto mb-4"
        />
        <h1 className="font-display font-bold text-xl uppercase tracking-wide">Basquete UTFPR</h1>

        {!link || erro ? (
          <>
            <p className="text-[13px] text-[var(--text-muted)] mt-1 mb-6">
              Painel do Basquete UTFPR.
            </p>
            <div className="text-left text-[12.5px] rounded-lg px-3 py-2 bg-[var(--danger-soft)] text-[var(--danger)]">
              Este link de acesso não vale mais: foi desativado pelo técnico ou expirou. Peça um
              link novo para ele.
            </div>
          </>
        ) : (
          <>
            <p className="text-[13px] text-[var(--text-muted)] mt-1 mb-1">
              {link.person_id
                ? "Seu acesso de atleta ao painel do time: sua ficha, seus arremessos, metas e ranking."
                : "Você recebeu acesso ao painel do técnico como comissão técnica."}
            </p>
            <p className="text-[12px] text-[var(--text-muted)] mb-6">
              Acesso de <strong className="text-[var(--text)]">{link.nome}</strong>
              {link.expira_em
                ? `, válido até ${new Date(link.expira_em).toLocaleDateString("pt-BR")}.`
                : " — sem prazo. Salve este link nos favoritos para entrar de novo."}
            </p>
            <form action={boundEntrar}>
              <button type="submit" className="btn w-full justify-center">
                Entrar no painel
              </button>
            </form>
            <p className="text-[11px] text-[var(--text-muted)] mt-4">
              Não compartilhe este link — quem tiver ele entra no painel.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
