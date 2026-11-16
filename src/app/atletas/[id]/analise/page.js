import { notFound } from "next/navigation";
import { requireCoachPage } from "@/components/Guard";
import { query } from "@/lib/db";
import ShootingAnalysis from "@/components/ShootingAnalysis";
import ShootingLog from "@/components/ShootingLog";

export default async function AthleteShootingAnalysisPage({ params }) {
  await requireCoachPage();
  const { id } = await params;

  const { rows } = await query("select id, nome from people where id = $1 and role = 'athlete'", [
    id,
  ]);
  const athlete = rows[0];
  if (!athlete) notFound();

  return (
    <>
      <ShootingAnalysis
        personId={athlete.id}
        titulo={athlete.nome}
        voltarHref={`/atletas/${athlete.id}`}
        voltarLabel={athlete.nome}
      />
      <h2 className="text-[13px] uppercase tracking-wide text-[var(--text-muted)] font-display font-semibold mt-8 mb-3">
        Treino a treino
      </h2>
      <ShootingLog personId={athlete.id} />
    </>
  );
}
