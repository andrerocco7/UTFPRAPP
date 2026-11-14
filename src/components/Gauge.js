// Velocímetro: arco de 240° de 0 até a meta, com o feito pintado na cor da
// equipe e um ponteiro. SVG puro (renderiza no servidor).
//
// feito / meta: números absolutos; o ponteiro trava no fim ao bater a meta.
export default function Gauge({ feito, meta, cor, titulo, unidade = "arremessos", tamanho = "lg" }) {
  const frac = meta > 0 ? Math.max(0, Math.min(1, feito / meta)) : 0;
  const pct = Math.round(frac * 100);
  const bateu = meta > 0 && feito >= meta;

  const CX = 120;
  const CY = 118;
  const R = 92;
  const INI = -120; // graus: 0 = pra cima, negativo = esquerda
  const FIM = 120;
  const ang = (f) => INI + (FIM - INI) * f;
  const ponto = (a, r = R) => {
    const rad = (a * Math.PI) / 180;
    return [CX + r * Math.sin(rad), CY - r * Math.cos(rad)];
  };
  const arco = (a0, a1, r = R) => {
    const [x0, y0] = ponto(a0, r);
    const [x1, y1] = ponto(a1, r);
    const grande = a1 - a0 > 180 ? 1 : 0;
    return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${grande} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
  };

  const aPonteiro = ang(frac);
  const [px, py] = ponto(aPonteiro, R - 22);
  const marcas = Array.from({ length: 11 }, (_, i) => i / 10);
  const fmt = (n) => Math.round(n).toLocaleString("pt-BR");

  return (
    <figure className="m-0">
      {titulo && <figcaption className="sr-only">{titulo}</figcaption>}
      <svg
        viewBox="0 0 240 196"
        className={`block w-full h-auto mx-auto ${tamanho === "sm" ? "max-w-[230px]" : "max-w-[320px]"}`}
        role="img"
        aria-label={`${titulo ? `${titulo}: ` : ""}${fmt(feito)} de ${fmt(meta)} ${unidade}, ${pct}% da meta`}
      >
        <title>{`${fmt(feito)} de ${fmt(meta)} ${unidade} — ${pct}% da meta`}</title>

        {/* trilho */}
        <path d={arco(INI, FIM)} fill="none" stroke="var(--bg-sunken)" strokeWidth="16" strokeLinecap="round" />
        {/* feito */}
        {frac > 0 && (
          <path d={arco(INI, aPonteiro)} fill="none" stroke={cor} strokeWidth="16" strokeLinecap="round" />
        )}

        {/* marcações: a cada 10%, maiores a cada 50% */}
        {marcas.map((f) => {
          const a = ang(f);
          const longa = f === 0 || f === 0.5 || f === 1;
          const [x0, y0] = ponto(a, R - 14);
          const [x1, y1] = ponto(a, R - (longa ? 24 : 19));
          return (
            <line key={f} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--text-muted)"
              strokeWidth={longa ? 2 : 1} strokeLinecap="round" opacity={longa ? 0.9 : 0.5} />
          );
        })}

        {/* ponteiro */}
        <line x1={CX} y1={CY} x2={px} y2={py} stroke="var(--text)" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={CX} cy={CY} r="8" fill="var(--text)" stroke="var(--bg-elevated)" strokeWidth="2" />

        {/* leitura */}
        <text x={CX} y={CY + 42} textAnchor="middle" fontSize="30" fontWeight="700"
          fill={bateu ? "var(--success)" : "var(--accent)"} style={{ fontFamily: "var(--font-oswald)" }}>
          {pct}%
        </text>
        <text x={CX} y={CY + 58} textAnchor="middle" fontSize="11" fill="var(--text-muted)">
          {bateu ? "meta batida 🔥" : "da meta"}
        </text>

        {/* extremos do arco: 0 e a meta */}
        <text x={ponto(INI)[0] + 4} y={ponto(INI)[1] + 24} textAnchor="middle" fontSize="11" fill="var(--text-muted)">
          0
        </text>
        <text x={ponto(FIM)[0] - 4} y={ponto(FIM)[1] + 24} textAnchor="middle" fontSize="11" fontWeight="600"
          fill="var(--text)">
          meta {fmt(meta)}
        </text>
      </svg>
      <div className="text-center text-[12.5px] tabular-nums -mt-1">
        <strong>{fmt(feito)}</strong>
        <span className="text-[var(--text-muted)]">
          {" "}
          de {fmt(meta)} {unidade}
        </span>
      </div>
    </figure>
  );
}
