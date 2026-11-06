import Link from "next/link";
import { query } from "@/lib/db";
import { SPOTS } from "@/lib/spots";

const TIPOS = [
  ["3pts", "3 pontos"],
  ["2pts", "2 pontos"],
  ["LL", "Lance livre"],
];

// Abaixo disso um ponto não entra em "mais forte/mais fraco": 2 de 2 não diz nada.
const MIN_TENTATIVAS_DESTAQUE = 10;

// Quantos treinos contam como "forma recente".
const TREINOS_RECENTES = 3;

function pct(m, a) {
  return a ? Math.round((m / a) * 100) : null;
}

// Mesmas faixas do mapa da quadra, para a cor significar a mesma coisa nas duas telas.
function cor(p) {
  if (p === null) return "var(--text-muted)";
  if (p >= 50) return "var(--success)";
  if (p >= 33) return "var(--warn)";
  return "var(--danger)";
}

function fmtPct(p) {
  return p === null ? "—" : `${p}%`;
}

function fmtData(d) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

// Análise completa dos arremessos de uma atleta. Usada na "Minha ficha" (a
// própria atleta) e na ficha que o técnico abre — quem pode ver quem é
// decidido pela página que chama.
export default async function ShootingAnalysis({ personId, titulo, voltarHref, voltarLabel }) {
  const { rows: porSpotRows } = await query(
    `select spot,
            sum(acertos)::int as acertos,
            sum(tentativas)::int as tentativas,
            count(*)::int as series
     from shooting_sets
     where person_id = $1
     group by spot`,
    [personId]
  );

  const { rows: porData } = await query(
    `select ss.data,
            sum(st.acertos)::int as acertos,
            sum(st.tentativas)::int as tentativas,
            count(*)::int as series
     from shooting_sets st
     join shooting_sessions ss on ss.id = st.session_id
     where st.person_id = $1
     group by ss.data
     order by ss.data desc`,
    [personId]
  );

  const porSpot = SPOTS.map((s) => {
    const r = porSpotRows.find((x) => x.spot === s.id);
    return {
      ...s,
      acertos: r?.acertos || 0,
      tentativas: r?.tentativas || 0,
      series: r?.series || 0,
    };
  });

  const acertos = porSpot.reduce((n, s) => n + s.acertos, 0);
  const tentativas = porSpot.reduce((n, s) => n + s.tentativas, 0);
  const series = porSpot.reduce((n, s) => n + s.series, 0);
  const geral = pct(acertos, tentativas);

  const porTipo = TIPOS.map(([tipo, label]) => {
    const ss = porSpot.filter((s) => s.tipo === tipo);
    const m = ss.reduce((n, s) => n + s.acertos, 0);
    const a = ss.reduce((n, s) => n + s.tentativas, 0);
    return { tipo, label, acertos: m, tentativas: a, p: pct(m, a) };
  });

  const elegiveis = porSpot
    .filter((s) => s.tentativas >= MIN_TENTATIVAS_DESTAQUE)
    .map((s) => ({ ...s, p: pct(s.acertos, s.tentativas) }))
    .sort((a, b) => b.p - a.p);
  const maisForte = elegiveis[0] || null;
  const maisFraco = elegiveis.length > 1 ? elegiveis[elegiveis.length - 1] : null;

  const recentes = porData.slice(0, TREINOS_RECENTES);
  const recM = recentes.reduce((n, d) => n + d.acertos, 0);
  const recA = recentes.reduce((n, d) => n + d.tentativas, 0);
  const formaRecente = pct(recM, recA);
  // Só compara se já existe histórico além dos treinos recentes.
  const deltaForma =
    porData.length > TREINOS_RECENTES && formaRecente !== null ? formaRecente - geral : null;

  // Pontos treinados primeiro (do pior pro melhor), os nunca treinados no fim.
  const tabelaSpots = porSpot
    .map((s) => ({ ...s, p: pct(s.acertos, s.tentativas) }))
    .sort((a, b) => {
      if (a.p === null && b.p === null) return 0;
      if (a.p === null) return 1;
      if (b.p === null) return -1;
      return a.p - b.p;
    });

  return (
    <div>
      <Link
        href={voltarHref}
        className="text-[12.5px] text-[var(--text-muted)] hover:text-[var(--accent)]"
      >
        ← {voltarLabel}
      </Link>
      <h1 className="text-2xl font-bold mt-3 mb-1">Análise de arremessos</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-6">
        {titulo} — todas as séries já lançadas, de todos os treinos.
      </p>

      {!tentativas ? (
        <div className="card p-6 text-[13.5px] text-[var(--text-muted)]">
          Nenhuma série registrada ainda. Lance séries em <strong>Arremessos</strong> e a análise
          aparece aqui.
        </div>
      ) : (
        <>
          {/* resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <Stat valor={fmtPct(geral)} label="Aproveitamento" cor={cor(geral)} />
            <Stat valor={tentativas} label="Arremessos feitos" />
            <Stat valor={acertos} label="Acertos" />
            <Stat
              valor={porData.length}
              label={`${porData.length === 1 ? "Treino" : "Treinos"} · ${series} séries`}
            />
          </div>

          {/* por tipo */}
          <Titulo>Por tipo de arremesso</Titulo>
          <div className="grid md:grid-cols-3 gap-3 mb-8">
            {porTipo.map((t) => (
              <div key={t.tipo} className="card p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display font-semibold text-[14px] uppercase">{t.label}</span>
                  <span
                    className="font-display font-bold text-[20px] tabular-nums"
                    style={{ color: cor(t.p) }}
                  >
                    {fmtPct(t.p)}
                  </span>
                </div>
                <Barra p={t.p} />
                <div className="text-[12px] text-[var(--text-muted)] mt-1.5 tabular-nums">
                  {t.tentativas ? `${t.acertos} de ${t.tentativas}` : "Ainda não treinado"}
                </div>
              </div>
            ))}
          </div>

          {/* destaques */}
          <Titulo>Destaques</Titulo>
          <div className="grid md:grid-cols-3 gap-3 mb-8">
            <Destaque
              label="Ponto mais forte"
              valor={maisForte ? maisForte.label : "—"}
              detalhe={
                maisForte
                  ? `${maisForte.p}% (${maisForte.acertos}/${maisForte.tentativas})`
                  : `Precisa de ${MIN_TENTATIVAS_DESTAQUE}+ arremessos num ponto`
              }
              corValor={maisForte ? cor(maisForte.p) : undefined}
            />
            <Destaque
              label="Ponto mais fraco"
              valor={maisFraco ? maisFraco.label : "—"}
              detalhe={
                maisFraco
                  ? `${maisFraco.p}% (${maisFraco.acertos}/${maisFraco.tentativas})`
                  : `Precisa de ${MIN_TENTATIVAS_DESTAQUE}+ arremessos em 2 pontos`
              }
              corValor={maisFraco ? cor(maisFraco.p) : undefined}
            />
            <Destaque
              label={`Forma recente (últimos ${Math.min(TREINOS_RECENTES, porData.length)} treinos)`}
              valor={fmtPct(formaRecente)}
              detalhe={
                deltaForma === null
                  ? "Comparação com a média aparece depois de mais treinos"
                  : deltaForma === 0
                    ? "Igual à média geral"
                    : `${deltaForma > 0 ? "+" : ""}${deltaForma} pts vs média geral (${geral}%)`
              }
              corValor={cor(formaRecente)}
              corDetalhe={
                deltaForma > 0 ? "var(--success)" : deltaForma < 0 ? "var(--danger)" : undefined
              }
            />
          </div>

          {/* por ponto */}
          <Titulo>Por ponto da quadra</Titulo>
          <div className="card overflow-x-auto mb-8">
            <table>
              <thead>
                <tr>
                  <th>Ponto</th>
                  <th>Tipo</th>
                  <th style={{ textAlign: "right" }}>Acertos</th>
                  <th style={{ textAlign: "right" }}>%</th>
                  <th className="w-[30%] hidden md:table-cell" />
                </tr>
              </thead>
              <tbody>
                {tabelaSpots.map((s) => (
                  <tr key={s.id} className={s.p === null ? "opacity-50" : ""}>
                    <td className="whitespace-nowrap">{s.label}</td>
                    <td className="text-[var(--text-muted)] whitespace-nowrap">
                      {TIPOS.find(([t]) => t === s.tipo)?.[1]}
                    </td>
                    <td style={{ textAlign: "right" }} className="tabular-nums whitespace-nowrap">
                      {s.tentativas ? `${s.acertos}/${s.tentativas}` : "—"}
                    </td>
                    <td
                      style={{ textAlign: "right", color: cor(s.p), fontWeight: 600 }}
                      className="tabular-nums"
                    >
                      {fmtPct(s.p)}
                    </td>
                    <td className="hidden md:table-cell">
                      <Barra p={s.p} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* por treino */}
          <Titulo>Por treino</Titulo>
          <div className="card overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th style={{ textAlign: "right" }}>Séries</th>
                  <th style={{ textAlign: "right" }}>Acertos</th>
                  <th style={{ textAlign: "right" }}>%</th>
                  <th style={{ textAlign: "right" }}>vs anterior</th>
                </tr>
              </thead>
              <tbody>
                {porData.map((d, i) => {
                  const p = pct(d.acertos, d.tentativas);
                  const anterior = porData[i + 1];
                  const delta = anterior ? p - pct(anterior.acertos, anterior.tentativas) : null;
                  return (
                    <tr key={String(d.data)}>
                      <td className="tabular-nums whitespace-nowrap">{fmtData(d.data)}</td>
                      <td style={{ textAlign: "right" }} className="tabular-nums">
                        {d.series}
                      </td>
                      <td style={{ textAlign: "right" }} className="tabular-nums whitespace-nowrap">
                        {d.acertos}/{d.tentativas}
                      </td>
                      <td
                        style={{ textAlign: "right", color: cor(p), fontWeight: 600 }}
                        className="tabular-nums"
                      >
                        {fmtPct(p)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          color:
                            delta > 0
                              ? "var(--success)"
                              : delta < 0
                                ? "var(--danger)"
                                : "var(--text-muted)",
                        }}
                        className="tabular-nums whitespace-nowrap"
                      >
                        {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta} pts`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Titulo({ children }) {
  return (
    <h2 className="text-[13px] uppercase tracking-wide text-[var(--text-muted)] font-display font-semibold mb-3">
      {children}
    </h2>
  );
}

function Stat({ valor, label, cor: c }) {
  return (
    <div className="card p-4">
      <div
        className="font-display font-bold text-[26px] tabular-nums leading-tight"
        style={{ color: c || "var(--accent)" }}
      >
        {valor}
      </div>
      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{label}</div>
    </div>
  );
}

function Destaque({ label, valor, detalhe, corValor, corDetalhe }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div
        className="font-display font-semibold text-[18px] mt-1"
        style={{ color: corValor || "var(--text)" }}
      >
        {valor}
      </div>
      <div
        className="text-[12px] mt-0.5 tabular-nums"
        style={{ color: corDetalhe || "var(--text-muted)" }}
      >
        {detalhe}
      </div>
    </div>
  );
}

function Barra({ p }) {
  return (
    <div className="h-1.5 rounded-full bg-[var(--bg-sunken)] mt-2 overflow-hidden">
      {p !== null && (
        <div className="h-full rounded-full" style={{ width: `${p}%`, background: cor(p) }} />
      )}
    </div>
  );
}
