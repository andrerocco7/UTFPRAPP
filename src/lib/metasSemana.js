import { query } from "@/lib/db";
import { TIPOS_META, META_TOTAL, tipoDoSpot, pontuar } from "@/lib/metas";

export const EQUIPES = [
  { cat: "F", nome: "Feminino", curto: "Fem", cor: "var(--fem)" },
  { cat: "M", nome: "Masculino", curto: "Masc", cor: "var(--masc)" },
];

// Datas vêm do banco como texto 'YYYY-MM-DD' para não passar por fuso.
export function fmtDia(iso) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function somaDias(iso, dias) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Posição de competição: empate divide a posição (1, 1, 3).
function comPosicao(lista) {
  let pos = 0;
  let anterior = null;
  return lista.map((a, i) => {
    if (a.pontos !== anterior) {
      pos = i + 1;
      anterior = a.pontos;
    }
    return { ...a, pos };
  });
}

// Semana pedida (?semana=YYYY-MM-DD) normalizada para a segunda-feira, nunca
// no futuro. Sem pedido, a semana atual.
export async function resolverSemana(pedida) {
  const { rows } = await query(
    `select to_char(date_trunc('week', current_date), 'YYYY-MM-DD') as atual,
            to_char(date_trunc('week', least(coalesce($1::date, current_date), current_date)),
                    'YYYY-MM-DD') as semana`,
    [/^\d{4}-\d{2}-\d{2}$/.test(pedida || "") ? pedida : null]
  );
  return { semana: rows[0].semana, semanaAtual: rows[0].atual };
}

// Pontuação da semana (segunda a domingo) de todo o elenco ativo e o resumo
// de cada equipe. Afastadas não entram em nada: nem na média da equipe, nem
// no top 3.
export async function carregarMetas(semana) {
  const { rows: atletas } = await query(
    `select id, nome, categoria from people
     where role = 'athlete' and status <> 'afastado' and categoria in ('F', 'M')
     order by nome`
  );

  const { rows: series } = await query(
    `select st.person_id, st.spot, st.tentativas
     from shooting_sets st
     join shooting_sessions ss on ss.id = st.session_id
     join people p on p.id = st.person_id
     where p.role = 'athlete' and p.status <> 'afastado'
       and ss.data >= $1::date and ss.data < $1::date + 7`,
    [semana]
  );

  // contagens[personId][tipo] = arremessos
  const contagens = {};
  for (const s of series) {
    const tipo = tipoDoSpot(s.spot);
    if (!tipo) continue;
    contagens[s.person_id] ??= {};
    contagens[s.person_id][tipo] = (contagens[s.person_id][tipo] || 0) + s.tentativas;
  }

  const resultado = atletas.map((a) => ({ ...a, ...pontuar(contagens[a.id] || {}) }));

  const equipes = EQUIPES.map((e) => {
    const lista = resultado.filter((a) => a.categoria === e.cat);
    const n = lista.length;
    const soma = (f) => lista.reduce((t, a) => t + f(a), 0);
    return {
      ...e,
      lista: [...lista].sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome)),
      ativos: n,
      media: n ? soma((a) => a.pontos) / n : 0,
      // Feito rumo à meta, limitado à meta de cada atleta: uma só não enche
      // o velocímetro da equipe.
      feitoMeta: soma((a) => a.base),
      metaEquipe: n * META_TOTAL,
      bateramTudo: lista.filter((a) => a.metasBatidas === TIPOS_META.length).length,
      treinaram: lista.filter((a) => a.pontos > 0).length,
      porTipo: TIPOS_META.map((t, i) => ({
        ...t,
        progresso: n ? soma((a) => a.porTipo[i].base) / (n * t.meta) : 0,
        bateram: lista.filter((a) => a.porTipo[i].bateu).length,
      })),
    };
  });
  const [fem, masc] = equipes;
  const lider = fem.media === masc.media ? null : fem.media > masc.media ? "F" : "M";

  const top3 = comPosicao(
    resultado
      .filter((a) => a.pontos > 0)
      .sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome))
  ).filter((a) => a.pos <= 3);

  return { resultado, equipes, lider, top3 };
}
