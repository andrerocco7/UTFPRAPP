import Link from "next/link";
import Image from "next/image";
import { signOutAction } from "@/app/actions";

const ADMIN_LINKS = [
  { href: "/", label: "Visão geral" },
  { href: "/atletas", label: "Atletas" },
  { href: "/treinos", label: "Treinos" },
  { href: "/competicoes", label: "Competições" },
  { href: "/escalacao", label: "Escalação" },
  { href: "/arremessos", label: "Arremessos" },
  { href: "/financeiro", label: "Financeiro" },
  { href: "/jogadas", label: "Jogadas táticas" },
];

const COORDINATOR_LINKS = [
  { href: "/", label: "Visão geral" },
  { href: "/financeiro", label: "Financeiro" },
  { href: "/treinos", label: "Treinos" },
  { href: "/competicoes", label: "Competições" },
  { href: "/jogadas", label: "Jogadas táticas" },
];

const ATHLETE_LINKS = [
  { href: "/", label: "Visão geral" },
  { href: "/minha-ficha", label: "Minha ficha" },
  { href: "/treinos", label: "Treinos" },
  { href: "/competicoes", label: "Competições" },
  { href: "/jogadas", label: "Jogadas táticas" },
];

export default function Sidebar({ user }) {
  const links =
    user.role === "admin"
      ? ADMIN_LINKS
      : user.role === "coordinator"
        ? COORDINATOR_LINKS
        : ATHLETE_LINKS;
  const papel =
    user.role === "admin"
      ? "Painel do técnico"
      : user.role === "coordinator"
        ? "Coordenação"
        : "Área do atleta";

  return (
    // No celular vira uma barra no topo; a partir de md volta a ser coluna lateral fixa.
    <aside
      className="w-full md:w-[220px] shrink-0 bg-[var(--bg-elevated)] flex flex-col
                 border-b border-[var(--border)] md:border-b-0 md:border-r
                 md:sticky md:top-0 md:h-dvh md:px-3 md:py-5"
    >
      <div
        className="flex items-center gap-2 px-4 py-3
                   md:px-2 md:pt-0 md:pb-4 md:mb-3 md:border-b-2 md:border-[var(--accent)]"
      >
        <Image src="/logo-utfpr.svg" alt="" width={34} height={34} className="shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-[15px] uppercase tracking-wide leading-none">
            Basquete UTFPR
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1 truncate">
            <span className="md:hidden">{user.nome || user.name}</span>
            <span className="hidden md:inline">{papel}</span>
          </div>
        </div>

        {/* No celular o "Sair" fica no topo, já que não existe rodapé de coluna. */}
        <form action={signOutAction} className="md:hidden shrink-0">
          <button type="submit" className="btn btn-secondary btn-small">
            Sair
          </button>
        </form>
      </div>

      {/* No celular os links quebram em linha; a partir de md viram a coluna lateral. */}
      <nav
        className="flex flex-wrap md:flex-col md:flex-nowrap gap-1 md:gap-0.5
                   px-3 pb-3 md:px-0 md:pb-0"
      >
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="px-2.5 py-2 rounded-lg text-[13.5px] whitespace-nowrap
                       bg-[var(--bg-sunken)] md:bg-transparent
                       hover:bg-[var(--bg-sunken)]"
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="hidden md:block mt-auto pt-4 border-t border-[var(--border)]">
        <div className="px-2 text-[12.5px] font-medium truncate">{user.nome || user.name}</div>
        <div className="px-2 text-[11px] text-[var(--text-muted)] truncate mb-2">{user.email}</div>
        <form action={signOutAction}>
          <button type="submit" className="btn btn-secondary btn-small w-full">
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
