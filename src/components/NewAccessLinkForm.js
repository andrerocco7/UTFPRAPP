"use client";

import { useActionState, useState } from "react";
import { createAccessLink } from "@/app/actions";

// atletas: [{ id, nome, categoria, externa }] — para o link de atleta.
export default function NewAccessLinkForm({ atletas = [], atletaInicial = null }) {
  const [estado, action, pendente] = useActionState(createAccessLink, null);
  const [copiado, setCopiado] = useState(false);
  // Atleta é o padrão: link de comissão dá poderes de técnico e foi criado
  // por engano para atleta — tem que ser escolha explícita.
  const [tipo, setTipo] = useState("atleta");

  const url = estado?.token ? `${window.location.origin}/entrar/${estado.token}` : null;
  // Externas primeiro: são quem mais precisa de link (não têm e-mail UTFPR).
  const ordenadas = [...atletas].sort((a, b) => b.externa - a.externa || a.nome.localeCompare(b.nome));

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
        className="flex flex-col gap-3"
      >
        <div className="flex gap-1.5 flex-wrap">
          {[
            ["atleta", "Atleta"],
            ["staff", "Comissão técnica"],
          ].map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setTipo(v)}
              className={`btn btn-small ${tipo === v ? "" : "btn-secondary"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <input type="hidden" name="tipo" value={tipo} />

        {tipo === "staff" ? (
          <p className="text-[12px] rounded-lg px-3 py-2 bg-[var(--danger-soft)] text-[var(--danger)]">
            Dá <strong>poderes de técnico</strong>: cadastra e remove atletas, lança séries de
            qualquer uma, edita treinos — sem ver e-mails, notas e Financeiro. Só para quem é da
            comissão técnica. Para atleta, use <strong>Atleta</strong>.
          </p>
        ) : (
          <p className="text-[12px] text-[var(--text-muted)]">
            Entra como a atleta escolhida: Minha ficha, lança os próprios arremessos, metas e
            ranking. Para quem não tem e-mail da UTFPR — quem tem pode entrar pelo Google.
          </p>
        )}

        <div className="grid md:grid-cols-[1fr_auto_auto] gap-3 items-end">
          {tipo === "staff" ? (
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
          ) : (
            <label className="block text-[11.5px] text-[var(--text-muted)]">
              Atleta
              <select
                name="personId"
                required
                defaultValue={atletaInicial ? String(atletaInicial) : ""}
                className="mt-1"
              >
                <option value="" disabled>
                  Escolha a atleta
                </option>
                {ordenadas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome} — {a.categoria === "F" ? "Fem" : "Masc"}
                    {a.externa ? " · externa" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-[11.5px] text-[var(--text-muted)]">
            Validade
            <select key={tipo} name="dias" defaultValue={tipo === "atleta" ? "0" : "30"} className="mt-1">
              {tipo === "atleta" && <option value="0">Sem prazo</option>}
              <option value="7">7 dias</option>
              <option value="30">30 dias</option>
              <option value="90">90 dias</option>
            </select>
          </label>
          <button type="submit" className="btn" disabled={pendente}>
            {pendente ? "Gerando…" : "Gerar link"}
          </button>
        </div>
      </form>

      {estado?.erro && (
        <div className="mt-3 text-[12.5px] rounded-lg px-3 py-2 bg-[var(--danger-soft)] text-[var(--danger)]">
          {estado.erro}
        </div>
      )}

      {url && (
        <div className="mt-4 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] p-3">
          <div className="text-[12.5px] font-semibold mb-1">
            Link de {estado.nome}
            {estado.tipo === "atleta" ? " (atleta)" : " (comissão técnica)"}
          </div>
          <div className="text-[12px] text-[var(--text-muted)] mb-2">
            Copie agora — por segurança ele não aparece de novo. Se perder, gere outro e desative
            este.
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
