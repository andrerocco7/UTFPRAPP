import { notFound } from "next/navigation";
import { requireAdminPage } from "@/components/Guard";
import { query } from "@/lib/db";
import ShootingAnalysis from "@/components/ShootingAnalysis";

export default async function AthleteShootingAnalysisPage({ params }) {
  await requireAdminPage();
  const { id } = await params;

  const { rows } = await query("select id, nome from people where id = $1 and role = 'athlete'", [
    id,
  ]);
  const athlete = rows[0];
  if (!athlete) notFound();

  return (
    <ShootingAnalysis
      personId={athlete.id}
      titulo={athlete.nome}
      voltarHref={`/atletas/${athlete.id}`}
      voltarLabel={athlete.nome}
    />
  );
}
