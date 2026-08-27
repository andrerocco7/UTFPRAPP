const CATEGORY_LABEL = { F: "Feminino", M: "Masculino" };
const STATUS_LABEL = {
  ativo: "Ativo",
  observacao: "Em observação",
  lesionado: "Lesionado",
  afastado: "Afastado",
};

export function CategoryTag({ categoria }) {
  if (!categoria) return null;
  return (
    <span className={`tag ${categoria === "F" ? "tag-fem" : "tag-masc"}`}>
      {CATEGORY_LABEL[categoria]}
    </span>
  );
}

export function StatusTag({ status }) {
  return <span className={`tag tag-${status}`}>{STATUS_LABEL[status] || status}</span>;
}
