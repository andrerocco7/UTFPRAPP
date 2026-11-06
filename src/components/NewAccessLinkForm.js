"use client";

import { useActionState, useState } from "react";
import { createAccessLink } from "@/app/actions";

export default function NewAccessLinkForm() {
  const [estado, action, pendente] = useActionState(createAccessLink, null);
  const [copiado, setCopiado] = useState(false);

  const url = estado?.token ? `${window.location.origin}/entrar/${estado.token}` : null;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="card p-5 mb-6">
      <h3 className="font-semibold text-[13.5px] mb-3">Novo link de acesso</h3>
      <form
        action={(fd) => {
          setCopiado(false);
          return action(fd);
        }}
        className="grid md:grid-cols-[1fr_auto_auto] gap-3 items-end"
      >
        <label className="block text-[11.5px] text-[var(--text-muted)]">
          Para quem
          <input
            type="text"
            name="nome"
            required
            placeholder="Ex: Assistente técnico — Marina"
            className="mt-1"
          />
        </label>
        <label className="block text-[11.5px] text-[var(--text-muted)]">
          Validade
          <select name="dias" defaultValue="30" className="mt-1">
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="90">90 dias</option>
          </select>
        </label>
        <button type="submit" className="btn" disabled={pendente}>
          {pendente ? "Gerando…" : "Gerar link"}
        </button>
      </form>

      {estado?.erro && (
        <div className="mt-3 text-[12.5px] rounded-lg px-3 py-2 bg-[var(--danger-soft)] text-[var(--danger)]">
          {estado.erro}
        </div>
      )}

      {url && (
        <div className="mt-4 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] p-3">
          <div className="text-[12.5px] font-semibold mb-1">Link de {estado.nome}</div>
          <div className="text-[12px] text-[var(--text-muted)] mb-2">
            Copie agora — por segurança ele não aparece de novo. Se perder, gere outro.
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              readOnly
              value={url}
              onFocus={(e) => e.target.select()}
              className="flex-1 min-w-0 text-[12px]"
            />
            <button type="button" onClick={copiar} className="btn btn-small shrink-0">
              {copiado ? "Copiado ✓" : "Copiar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
