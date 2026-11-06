import { requireSessionPage } from "@/components/Guard";
import { query } from "@/lib/db";
import CourtChart from "@/components/CourtChart";

export default async function ShootingPage() {
  const user = await requireSessionPage();
  const isAdmin = user.role === "admin";

  // Técnico lança para qualquer atleta ativa; a atleta só para si mesma.
  const { rows: atletas } = isAdmin
    ? await query(
        `select id, nome, categoria
         from people
         where role = 'athlete' and status <> 'afastado'
         order by nome`
      )
    : await query(
        "select id, nome, categoria from people where id = $1 and role = 'athlete'",
        [user.personId]
      );

  // Só as séries de hoje — o histórico completo vive na ficha do atleta.
  const { rows: sets } = await query(
    `select st.id, st.person_id, st.spot, st.tentativas, st.acertos, p.nome
     from shooting_sets st
     join shooting_sessions ss on ss.id = st.session_id
     join people p on p.id = st.person_id
     where ss.data = current_date
       and ($1::int is null or st.person_id = $1)
     order by st.criado_em desc`,
    [isAdmin ? null : user.personId]
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Arremessos</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-6">
        {isAdmin
          ? "Escolha o atleta, toque no ponto e marque quantos ele acertou na série."
          : "Toque no ponto da quadra e marque quantos você acertou na série."}{" "}
        Pode tocar no mesmo ponto de novo quantas vezes quiser — cada toque soma uma série nova,
        não substitui a anterior.
      </p>
      <CourtChart
        atletas={atletas}
        sets={sets}
        isAdmin={isAdmin}
        categoriaInicial={isAdmin ? "M" : atletas[0]?.categoria}
      />
    </div>
  );
}
