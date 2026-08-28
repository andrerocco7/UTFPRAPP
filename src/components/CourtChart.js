"use client";

import { useMemo, useState, useTransition } from "react";
import { SPOTS, SERIES_SIZES, spotLabel } from "@/lib/spots";
import { addShootingSet, deleteShootingSet } from "@/app/actions";

const R = 92;

// O time tem tres Arthur, dois Joao e dois Nicolas — so o primeiro nome
// nao distingue quem e quem na lista de series.
function nomeCurto(nome) {
  return nome.split(" ").slice(0, 2).join(" ");
}

function pct(m, a) {
  return a ? Math.round((m / a) * 100) : null;
}

// Verde acima de 50%, amarelo até 33%, vermelho abaixo — para achar
// o ponto fraco batendo o olho no mapa.
function cores(p) {
  if (p === null) return { fill: "#1e1d21", stroke: "#3a3830", txt: "#8b8478" };
  if (p >= 50) return { fill: "#123328", stroke: "#3ed198", txt: "#3ed198" };
  if (p >= 33) return { fill: "#3a2610", stroke: "#ffab40", txt: "#ffab40" };
  return { fill: "#3a1616", stroke: "#ff6b6b", txt: "#ff6b6b" };
}

export default function CourtChart({ atletas, sets }) {
  const [categoria, setCategoria] = useState("M");
  const [personId, setPersonId] = useState(null);
  const [spot, setSpot] = useState(null);
  const [serie, setSerie] = useState(10);
  const [pendente, startTransition] = useTransition();

  const lista = useMemo(
    () => atletas.filter((a) => a.categoria === categoria),
    [atletas, categoria]
  );

  const atual = lista.find((a) => a.id === personId) || lista[0] || null;

  // Acumulado do atleta selecionado no treino de hoje.
  const porSpot = useMemo(() => {
    const acc = {};
    SPOTS.forEach((s) => (acc[s.id] = { m: 0, a: 0 }));
    if (!atual) return acc;
    sets
      .filter((s) => s.person_id === atual.id)
      .forEach((s) => {
        acc[s.spot].m += s.acertos;
        acc[s.spot].a += s.tentativas;
      });
    return acc;
  }, [sets, atual]);

  const totalM = SPOTS.reduce((n, s) => n + porSpot[s.id].m, 0);
  const totalA = SPOTS.reduce((n, s) => n + porSpot[s.id].a, 0);

  function registrar(acertos) {
    if (!atual || !spot) return;
    const fd = new FormData();
    fd.set("personId", String(atual.id));
    fd.set("categoria", categoria);
    fd.set("spot", spot);
    fd.set("tentativas", String(serie));
    fd.set("acertos", String(acertos));
    startTransition(() => addShootingSet(fd));
  }

  function proximoAtleta() {
    if (!lista.length) return;
    const i = lista.findIndex((a) => a.id === atual?.id);
    const prox = lista[(i + 1) % lista.length];
    setPersonId(prox.id);
    setSpot(null);
  }

  if (!atletas.length) {
    return (
      <div className="card p-6 text-[13.5px] text-[var(--text-muted)]">
        Cadastre atletas em <strong>Atletas</strong> para começar a registrar arremessos.
      </div>
    );
  }

  const dadosSpot = spot ? porSpot[spot] : null;

  return (
    <div className="flex flex-col gap-4">
      {/* categoria + atleta */}
      <div className="card p-3 flex flex-col gap-3">
        <div className="flex gap-1.5">
          {["F", "M"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCategoria(c);
                setPersonId(null);
                setSpot(null);
              }}
              className={`btn btn-small ${categoria === c ? "" : "btn-secondary"}`}
            >
              {c === "F" ? "Feminino" : "Masculino"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={atual?.id ?? ""}
            onChange={(e) => {
              setPersonId(Number(e.target.value));
              setSpot(null);
            }}
            aria-label="Atleta"
          >
            {lista.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={proximoAtleta}
            className="btn btn-secondary btn-small shrink-0 whitespace-nowrap"
          >
            Próximo →
          </button>
        </div>
      </div>

      {/* quadra */}
      <div className="card p-1.5">
        <svg viewBox="0 0 1500 980" className="block w-full h-auto" style={{ touchAction: "manipulation" }}>
          <rect x="0" y="0" width="1500" height="980" fill="#111013" rx="6" />
          <rect x="505" y="0" width="490" height="580" fill="#191722" stroke="#4a4636" strokeWidth="6" />
          <circle cx="750" cy="580" r="180" fill="none" stroke="#4a4636" strokeWidth="6" />
          <path
            d="M 90 0 L 90 299 A 675 675 0 0 0 1410 299 L 1410 0"
            fill="none"
            stroke="#4a4636"
            strokeWidth="7"
          />
          <line x1="640" y1="105" x2="860" y2="105" stroke="#a3998a" strokeWidth="9" />
          <circle cx="750" cy="160" r="26" fill="none" stroke="#e06a2b" strokeWidth="8" />
          <rect x="4" y="4" width="1492" height="972" fill="none" stroke="#4a4636" strokeWidth="6" rx="4" />

          {SPOTS.map((s) => {
            const d = porSpot[s.id];
            const p = pct(d.m, d.a);
            const c = cores(p);
            const sel = spot === s.id;
            return (
              <g
                key={s.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer"
                aria-label={`${s.label}${d.a ? `: ${d.m} de ${d.a}` : ": sem registro"}`}
                onClick={() => setSpot(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSpot(s.id);
                  }
                }}
              >
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={R}
                  fill={c.fill}
                  stroke={sel ? "#ffcc00" : c.stroke}
                  strokeWidth={sel ? 10 : 5}
                />
                <text
                  x={s.x}
                  y={s.y + 16}
                  textAnchor="middle"
                  fontSize={d.a ? 44 : 46}
                  fontWeight="600"
                  fill={sel ? "#ffcc00" : c.txt}
                  className="font-display pointer-events-none tabular-nums"
                >
                  {d.a ? `${d.m}/${d.a}` : "+"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* lançamento da série */}
      <div className="card">
        {!spot ? (
          <div className="p-6 text-center text-[13px] text-[var(--text-muted)]">
            Toque num ponto da quadra para lançar uma série.
          </div>
        ) : (
          <div className="p-3.5 flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display font-semibold text-[17px] uppercase">
                {spotLabel(spot)}
              </span>
              <span className="font-display font-bold text-[19px] text-[var(--accent)] tabular-nums">
                {dadosSpot.m}/{dadosSpot.a}{" "}
                <small className="text-[12px] text-[var(--text-muted)] font-medium">
                  {pct(dadosSpot.m, dadosSpot.a) === null ? "—" : `${pct(dadosSpot.m, dadosSpot.a)}%`}
                </small>
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                Série de
              </span>
              {SERIES_SIZES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSerie(n)}
                  className={`rounded-full px-3 py-1 text-[13px] font-semibold border ${
                    serie === n
                      ? "bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)]"
                      : "bg-[var(--bg-sunken)] text-[var(--text-muted)] border-[var(--border)]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="text-[13px] text-[var(--text-muted)]">Quantos acertou?</div>
            <div className="grid grid-cols-6 gap-1.5">
              {Array.from({ length: serie + 1 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={pendente}
                  onClick={() => registrar(i)}
                  className={`rounded-[10px] border border-[var(--border)] bg-[var(--bg-sunken)] py-3.5 text-[17px] font-bold tabular-nums disabled:opacity-40 ${
                    i === 0 ? "text-[var(--danger)]" : i === serie ? "text-[var(--success)]" : ""
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* totais do atleta hoje */}
      <div className="grid grid-cols-3 gap-2">
        {[
          [totalM, "Acertos"],
          [totalA, "Tentativas"],
          [totalA ? `${Math.round((totalM / totalA) * 100)}%` : "—", "Aproveitamento"],
        ].map(([v, l]) => (
          <div key={l} className="card p-3 text-center">
            <div className="font-display font-bold text-[23px] text-[var(--accent)] tabular-nums">
              {v}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{l}</div>
          </div>
        ))}
      </div>

      {/* séries do treino */}
      <div className="card overflow-hidden">
        <div className="text-[10.5px] uppercase tracking-wide text-[var(--text-muted)] px-3 pt-3 pb-2">
          Séries deste treino
        </div>
        {!sets.length ? (
          <div className="px-3 pb-3 text-[13px] italic text-[var(--text-muted)]">
            Nenhuma série ainda.
          </div>
        ) : (
          <div className="flex flex-col">
            {sets.map((s) => {
              const p = pct(s.acertos, s.tentativas);
              const cor = p >= 50 ? "var(--success)" : p >= 33 ? "var(--warn)" : "var(--danger)";
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-2 px-3 py-2 border-t border-[var(--border)] text-[13px]"
                >
                  <span className="flex-1 min-w-0 truncate">
                    {nomeCurto(s.nome)} · {spotLabel(s.spot)}
                  </span>
                  <span className="font-semibold tabular-nums" style={{ color: cor }}>
                    {s.acertos}/{s.tentativas}
                  </span>
                  <button
                    type="button"
                    aria-label="Remover série"
                    onClick={() => startTransition(() => deleteShootingSet(s.id))}
                    className="text-[var(--text-muted)] hover:text-[var(--danger)] px-1"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
