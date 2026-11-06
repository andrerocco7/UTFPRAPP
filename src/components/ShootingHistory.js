import Link from "next/link";
import { query } from "@/lib/db";
import { spotLabel } from "@/lib/spots";

// Histórico de arremessos de uma atleta: aproveitamento por ponto (todas as
// séries já lançadas) e os últimos treinos. Usado na ficha que o técnico vê
// e na "Minha ficha" da própria atleta.
export default async function ShootingHistory({ personId, analiseHref }) {
  // Aproveitamento por ponto da quadra, somando todas as series ja lancadas.
  const { rows: porSpot } = await query(
    `select spot,
            sum(acertos)::int as acertos,
            sum(tentativas)::int as tentativas
     from shooting_sets
     where person_id = $1
     group by spot
     order by sum(acertos)::float / nullif(sum(tentativas), 0) asc nulls last`,
    [personId]
  );

  // Ultimos treinos, para ver se esta subindo ou caindo.
  const { rows: porData } = await query(
    `select ss.data,
            sum(st.acertos)::int as acertos,
            sum(st.tentativas)::int as tentativas
     from shooting_sets st
     join shooting_sessions ss on ss.id = st.session_id
     where st.person_id = $1
     group by ss.data
     order by ss.data desc
     limit 8`,
    [personId]
  );

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-[13px] uppercase tracking-wide text-[var(--text-muted)] font-display font-semibold">
          Arremessos
        </h2>
        {analiseHref && porSpot.length > 0 && (
          <Link href={analiseHref} className="btn btn-small">
            Ver análise →
          </Link>
        )}
      </div>
      {!porSpot.length ? (
        <div className="text-[13px] italic text-[var(--text-muted)] mb-8">
          Nenhuma série registrada ainda.
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-8">
          <div className="card overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Ponto</th>
                  <th style={{ textAlign: "right" }}>Acertos</th>
                  <th style={{ textAlign: "right" }}>%</th>
                </tr>
              </thead>
              <tbody>
                {porSpot.map((r) => {
                  const p = Math.round((r.acertos / r.tentativas) * 100);
                  const cor =
                    p >= 50 ? "var(--success)" : p >= 33 ? "var(--warn)" : "var(--danger)";
                  return (
                    <tr key={r.spot}>
                      <td>{spotLabel(r.spot)}</td>
                      <td style={{ textAlign: "right" }}>
                        {r.acertos}/{r.tentativas}
                      </td>
                      <td style={{ textAlign: "right", color: cor, fontWeight: 600 }}>{p}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card p-4">
            <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] mb-3">
              Últimos treinos
            </div>
            <div className="flex items-end gap-2 h-[70px]">
              {porData
                .slice()
                .reverse()
                .map((d) => {
                  const p = Math.round((d.acertos / d.tentativas) * 100);
                  return (
                    <div key={d.data} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[10px] text-[var(--text-muted)] tabular-nums">{p}%</div>
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: `${Math.max(4, p * 0.45)}px`,
                          background: p >= 50 ? "var(--success)" : p >= 33 ? "var(--warn)" : "var(--danger)",
                        }}
                        title={`${d.acertos}/${d.tentativas}`}
                      />
                      <div className="text-[9.5px] text-[var(--text-muted)] tabular-nums">
                        {new Date(d.data).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
