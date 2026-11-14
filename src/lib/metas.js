import { SPOTS } from "@/lib/spots";

// Meta semanal de cada atleta, por tipo de arremesso. Conta arremessos feitos
// (tentativas), acertando ou não — a meta é de volume de treino.
export const TIPOS_META = [
  { tipo: "LL", label: "Lance livre", curto: "LL", meta: 100 },
  { tipo: "3pts", label: "3 pontos", curto: "3pts", meta: 100 },
  { tipo: "2pts", label: "2 pontos", curto: "2pts", meta: 100 },
];

export const META_TOTAL = TIPOS_META.reduce((n, t) => n + t.meta, 0);

// Depois de bater a meta de um tipo, cada arremesso extra daquele tipo vale
// isso — para incentivar a passar da meta.
export const MULTIPLICADOR_EXTRA = 1.5;

const TIPO_DO_SPOT = Object.fromEntries(SPOTS.map((s) => [s.id, s.tipo]));

export function tipoDoSpot(spot) {
  return TIPO_DO_SPOT[spot];
}

// Pontos de uma atleta numa semana. contagens = { LL: n, "3pts": n, "2pts": n }.
export function pontuar(contagens) {
  const porTipo = TIPOS_META.map((t) => {
    const feitos = contagens[t.tipo] || 0;
    const base = Math.min(feitos, t.meta);
    const extra = Math.max(feitos - t.meta, 0);
    return {
      ...t,
      feitos,
      base,
      extra,
      bateu: feitos >= t.meta,
      pontos: base + extra * MULTIPLICADOR_EXTRA,
    };
  });
  return {
    porTipo,
    base: porTipo.reduce((n, t) => n + t.base, 0),
    pontos: porTipo.reduce((n, t) => n + t.pontos, 0),
    metasBatidas: porTipo.filter((t) => t.bateu).length,
  };
}

export function fmtPontos(n) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}
