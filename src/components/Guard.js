import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");
  return session.user;
}

export async function requireSessionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

// Financeiro: tecnico ve as duas equipes; coordenador so a propria equipe
// (definida pela coluna categoria em people). Coordenadores sao cadastrados
// pelo tecnico na aba Atletas.
export async function requireFinancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["admin", "coordinator"].includes(session.user.role)) redirect("/");
  return session.user;
}
