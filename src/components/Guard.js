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
