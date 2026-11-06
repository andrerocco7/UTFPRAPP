import { redirect } from "next/navigation";
import { requireSessionPage } from "@/components/Guard";
import ShootingAnalysis from "@/components/ShootingAnalysis";

// A atleta só vê a própria análise: o personId vem da sessão.
export default async function MyShootingAnalysisPage() {
  const user = await requireSessionPage();
  if (user.role !== "athlete") redirect("/");

  return (
    <ShootingAnalysis
      personId={user.personId}
      titulo="Seu desempenho"
      voltarHref="/minha-ficha"
      voltarLabel="Minha ficha"
    />
  );
}
