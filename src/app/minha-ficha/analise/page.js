import { redirect } from "next/navigation";
import { requireSessionPage } from "@/components/Guard";
import ShootingAnalysis from "@/components/ShootingAnalysis";
import ShootingLog from "@/components/ShootingLog";

// A atleta só vê a própria análise: o personId vem da sessão.
export default async function MyShootingAnalysisPage() {
  const user = await requireSessionPage();
  if (user.role !== "athlete") redirect("/");

  return (
    <>
      <ShootingAnalysis
        personId={user.personId}
        titulo="Seu desempenho"
        voltarHref="/minha-ficha"
        voltarLabel="Minha ficha"
      />
      <h2 className="text-[13px] uppercase tracking-wide text-[var(--text-muted)] font-display font-semibold mt-8 mb-3">
        Treino a treino
      </h2>
      <ShootingLog personId={user.personId} />
    </>
  );
}
