import Link from "next/link";
import Image from "next/image";
import { signOutAction } from "@/app/actions";

const ADMIN_LINKS = [
  { href: "/", label: "Visão geral" },
  { href: "/atletas", label: "Atletas" },
  { href: "/treinos", label: "Treinos" },
  { href: "/competicoes", label: "Competições" },
  { href: "/escalacao", label: "Escalação" },
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
  const links = user.role === "admin" ? ADMIN_LINKS : ATHLETE_LINKS;

  return (
    <aside className="w-[220px] shrink-0 border-r border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-5 flex flex-col">
      <div className="flex items-center gap-2 px-2 pb-4 mb-3 border-b-2 border-[var(--accent)]">
        <Image src="/logo-utfpr.svg" alt="" width={34} height={34} />
        <div>
          <div className="font-display font-bold text-[15px] uppercase tracking-wide leading-none">
            Basquete UTFPR
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
            {user.role === "admin" ? "Painel do técnico" : "Área do atleta"}
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-[var(--bg-sunken)]"
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-[var(--border)]">
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
