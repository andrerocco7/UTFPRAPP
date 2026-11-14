"use client";

import { useState, useTransition } from "react";
import { updateAthleteStatus } from "@/app/actions";

const OPCOES = [
  ["ativo", "Ativo"],
  ["observacao", "Em observação"],
  ["lesionado", "Lesionado"],
  ["afastado", "Afastado"],
];

const COR = {
  ativo: "var(--success)",
  observacao: "var(--warn)",
  lesionado: "var(--danger)",
  afastado: "var(--text-muted)",
};

// Troca o status direto na lista de atletas: salva ao escolher, sem botão.
export default function StatusSelect({ personId, status }) {
  const [valor, setValor] = useState(status);
  const [erro, setErro] = useState(false);
  const [pendente, startTransition] = useTransition();

  function mudar(novo) {
    const anterior = valor;
    setValor(novo);
    setErro(false);
    startTransition(async () => {
      try {
        await updateAthleteStatus(personId, novo);
      } catch {
        setValor(anterior);
        setErro(true);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <select
        value={valor}
        onChange={(e) => mudar(e.target.value)}
        disabled={pendente}
        aria-label="Status da atleta"
        className="!w-auto text-[12.5px] font-semibold !py-1 !px-2"
        style={{ color: COR[valor] }}
      >
        {OPCOES.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      {erro && <span className="text-[10.5px] text-[var(--danger)]">não salvou</span>}
    </div>
  );
}
