// Dinheiro trafega em centavos (integer) do banco ate a tela.
// Converter para float em qualquer ponto do caminho acumula erro em soma.

export function formatBRL(centavos) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Aceita "150", "150,50", "1.250,00" e "1250.50" — o que a pessoa digitar.
export function parseBRLToCents(texto) {
  const limpo = String(texto || "").trim().replace(/[R$\s]/g, "");
  if (!limpo) return null;

  let normalizado;
  if (limpo.includes(",")) {
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else {
    normalizado = limpo;
  }

  const n = Number(normalizado);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}
