import { query } from "@/lib/db";
import { SPOTS } from "@/lib/spots";

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const TIPO_LABEL = { "3pts": "3 pontos", "2pts": "2 pontos", LL: "Lance livre" };
const ORDEM_SPOT = Object.fromEntries(SPOTS.map((s, i) => [s.id, i]));

function pct(m, a) {
  return a ? Math.round((m / a) * 100) : null;
}

function cor(p) {
  if (p === null) return "var(--text-muted)";
  if (p >= 50) return "var(--success)";
  if (p >= 33) return "var(--warn)";
  return "var(--danger)";
}

// 'YYYY-MM-DD' (texto do banco, sem fuso) -> "seg, 09/11/26"
function fmtDia(iso) {
  const [y, m, d] = iso.split("-");
  const dow = new Date(Date.UTC(+y, +m - 1, +d)).getUTCDay();
  return `${DIAS[dow]}, ${d}/${m}/${y.slice(2)}`;
}

// Histórico treino a treino de uma atleta: cada dia com as séries de cada
// ponto, na ordem em que foram lançadas. O treino mais recente vem aberto.
export default async function ShootingLog({ personId, limiteDias = 40 }) {
  const { rows } = await query(
    `with dias as (
       select distinct ss.data
       from shooting_sets st
       join shooting_sessions ss on ss.id = st.session_id
       where st.person_id = $1
       order by ss.data desc
       limit $2
     )
     select st.id, st.spot, st.tentativas, st.acertos,
            to_char(ss.data, 'YYYY-MM-DD') as dia
     from shooting_sets st
     join shooting_sessions ss on ss.id = st.session_id
     where st.person_id = $1 and ss.data in (select data from dias)
     order by ss.data desc, st.criado_em`,
    [personId, limiteDias]
  );

  if (!rows.length) {
    return (
      <div className="card p-6 text-[13.5px] text-[var(--text-muted)]">
        Nenhuma série registrada ainda. Lance na aba <strong>Lançar séries</strong> e cada treino
        aparece aqui.
      </div>
    );
  }

  const dias = [];
  for (const r of rows) {
    let d = dias[dias.length - 1];
    if (!d || d.dia !== r.dia) {
      d = { dia: r.dia, series: [] };
      dias.push(d);
    }
    d.series.push(r);
  }

  return (
    <div className="flex flex-col gap-2">
      {dias.map((d, i) => {
        const m = d.series.reduce((n, s) => n + s.acertos, 0);
        const a = d.series.reduce((n, s) => n + s.tentativas, 0);
        const p = pct(m, a);

        const porSpot = {};
        for (const s of d.series) (porSpot[s.spot] ??= []).push(s);
        const spots = Object.keys(porSpot).sort((x, y) => ORDEM_SPOT[x] - ORDEM_SPOT[y]);

        return (
          <details key={d.dia} open={i === 0} className="card overflow-hidden group">
            <summary className="cursor-pointer select-none px-4 py-3 flex items-center gap-3">
              <span className="text-[var(--text-muted)] text-[11px] group-open:rotate-90 transition-transform">
                ▶
              </span>
              <span className="flex-1 min-w-0">
                <span className="font-semibold text-[13.5px] tabular-nums">{fmtDia(d.dia)}</span>
                <span className="text-[11.5px] text-[var(--text-muted)]">
                  {" "}
                  · {d.series.length} {d.series.length === 1 ? "série" : "séries"} · {spots.length}{" "}
                  {spots.length === 1 ? "ponto" : "pontos"}
                </span>
              </span>
              <span className="text-[13.5px] font-semibold tabular-nums shrink-0">
                {m}/{a} <span style={{ color: cor(p) }}>{p}%</span>
              </span>
            </summary>

            <div className="border-t border-[var(--border)]">
              {spots.map((spot) => {
                const info = SPOTS.find((s) => s.id === spot);
                const ss = porSpot[spot];
                const sm = ss.reduce((n, s) => n + s.acertos, 0);
                const sa = ss.reduce((n, s) => n + s.tentativas, 0);
                const sp = pct(sm, sa);
                return (
                  <div
                    key={spot}
                    className="px-4 py-2.5 border-t first:border-t-0 border-[var(--border)] flex items-start gap-3"
                  >
                    <div className="w-[118px] shrink-0">
                      <div className="text-[13px] font-semibold">{info?.label || spot}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {TIPO_LABEL[info?.tipo] || ""}
                      </div>
                    </div>
                    <div className="flex-1 flex flex-wrap gap-1">
                      {ss.map((s, k) => (
                        <span
                          key={s.id}
                          title={`Série ${k + 1}`}
                          className="rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] px-2 py-0.5 text-[12px] tabular-nums"
                        >
                          {s.acertos}/{s.tentativas}
                        </span>
                      ))}
                    </div>
                    <div className="shrink-0 text-right text-[12.5px] tabular-nums">
                      <div className="font-semibold">
                        {sm}/{sa}
                      </div>
                      <div style={{ color: cor(sp) }} className="font-semibold">
                        {sp}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        );
      })}
      {dias.length === limiteDias && (
        <div className="text-[11.5px] text-[var(--text-muted)] text-center">
          Mostrando os últimos {limiteDias} treinos.
        </div>
      )}
    </div>
  );
}
