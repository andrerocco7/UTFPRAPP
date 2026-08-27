import { requireAdminPage } from "@/components/Guard";
import { query } from "@/lib/db";
import CourtChart from "@/components/CourtChart";

export default async function ShootingPage() {
  await requireAdminPage();

  const { rows: atletas } = await query(
    `select id, nome, categoria
     from people
     where role = 'athlete' and status <> 'afastado'
     order by nome`
  );

  // Só as séries de hoje — o histórico completo vive na ficha do atleta.
  const { rows: sets } = await query(
    `select st.id, st.person_id, st.spot, st.tentativas, st.acertos, p.nome
     from shooting_sets st
     join shooting_sessions ss on ss.id = st.session_id
     join people p on p.id = st.person_id
     where ss.data = current_date
     order by st.criado_em desc`
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Arremessos</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-6">
        Escolha o atleta, toque no ponto e marque quantos ele acertou na série.
      </p>
      <CourtChart atletas={atletas} sets={sets} />
    </div>
  );
}
