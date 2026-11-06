import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isCoach } from "@/lib/roles";

// Telas de técnico que a comissão técnica (staff) também usa.
export async function requireCoachPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!isCoach(session.user)) redirect("/");
  return session.user;
}

// Só o técnico: dados sensíveis e gestão de acessos.
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

// Financeiro: tecnico (admin) ve as duas equipes; uma atleta com coordena=true
// ve so a propria equipe (coluna categoria em people). A flag e ligada pelo
// tecnico na aba Atletas.
export async function requireFinancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin" && !session.user.coordena) redirect("/");
  return session.user;
}
