// Pontos de arremesso da meia quadra. As coordenadas sao do viewBox do SVG
// em src/components/CourtChart.js — mexer aqui move o ponto no desenho.
export const SPOTS = [
  { id: "corner-l", x: 110, y: 170, label: "Canto esq.", tipo: "3pts" },
  { id: "wing-l", x: 280, y: 690, label: "Ala esq.", tipo: "3pts" },
  { id: "top", x: 750, y: 845, label: "Topo", tipo: "3pts" },
  { id: "wing-r", x: 1220, y: 690, label: "Ala dir.", tipo: "3pts" },
  { id: "corner-r", x: 1390, y: 170, label: "Canto dir.", tipo: "3pts" },
  { id: "base-l", x: 350, y: 320, label: "Meia-dist. esq.", tipo: "2pts" },
  { id: "elbow-l", x: 505, y: 585, label: "Cotovelo esq.", tipo: "2pts" },
  { id: "ft", x: 750, y: 585, label: "Lance livre", tipo: "LL" },
  { id: "elbow-r", x: 995, y: 585, label: "Cotovelo dir.", tipo: "2pts" },
  { id: "base-r", x: 1150, y: 320, label: "Meia-dist. dir.", tipo: "2pts" },
  { id: "paint", x: 750, y: 300, label: "Garrafão", tipo: "2pts" },
];

export const SPOT_IDS = SPOTS.map((s) => s.id);

export function spotLabel(id) {
  const s = SPOTS.find((x) => x.id === id);
  return s ? s.label : id;
}

export const SERIES_SIZES = [5, 10, 20, 25];
