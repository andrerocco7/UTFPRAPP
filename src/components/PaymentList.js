"use client";

import { useState, useTransition } from "react";
import { togglePayment } from "@/app/actions";
import { formatBRL } from "@/lib/money";

export default function PaymentList({ charge, atletas, pagos }) {
  const [aberto, setAberto] = useState(false);
  const [pendente, startTransition] = useTransition();

  const pagosSet = new Set(pagos);
  const quantosPagaram = atletas.filter((a) => pagosSet.has(a.id)).length;
  const arrecadado = quantosPagaram * charge.valor_centavos;
  const previsto = atletas.length * charge.valor_centavos;
  const faltam = atletas.length - quantosPagaram;

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-[var(--bg-sunken)]"
        aria-expanded={aberto}
      >
        <div className="min-w-0">
          <div className="font-display font-semibold text-[15px]">{charge.titulo}</div>
          <div className="text-[12px] text-[var(--text-muted)] mt-0.5">
            {formatBRL(charge.valor_centavos)} por atleta ·{" "}
            {charge.categoria === "ambos"
              ? "as duas equipes"
              : charge.categoria === "F"
                ? "feminino"
                : "masculino"}
            {charge.vencimento
              ? ` · vence ${new Date(charge.vencimento).toLocaleDateString("pt-BR", {
                  timeZone: "UTC",
                })}`
              : ""}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display font-bold text-[15px] tabular-nums text-[var(--accent)]">
            {formatBRL(arrecadado)}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] tabular-nums">
            {quantosPagaram}/{atletas.length} pagaram
          </div>
        </div>
      </button>

      {/* Barra de progresso: quanto do previsto ja entrou. */}
      <div className="h-1 bg-[var(--bg-sunken)]">
        <div
          className="h-full bg-[var(--success)]"
          style={{ width: previsto ? `${(arrecadado / previsto) * 100}%` : "0%" }}
        />
      </div>

      {aberto && (
        <div className="border-t border-[var(--border)]">
          {!atletas.length ? (
            <div className="p-4 text-[13px] italic text-[var(--text-muted)]">
              Nenhum atleta nesta equipe.
            </div>
          ) : (
            <>
              <div className="px-4 py-2 text-[11px] text-[var(--text-muted)] border-b border-[var(--border)]">
                {faltam === 0
                  ? "Todo mundo pagou."
                  : `Faltam ${faltam} · ${formatBRL(previsto - arrecadado)} a receber`}
              </div>
              {atletas.map((a) => {
                const pago = pagosSet.has(a.id);
                return (
                  <label
                    key={a.id}
                    className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] last:border-b-0 cursor-pointer hover:bg-[var(--bg-sunken)]"
                  >
                    <input
                      type="checkbox"
                      checked={pago}
                      disabled={pendente}
                      onChange={(e) =>
                        startTransition(() =>
                          togglePayment(charge.id, a.id, e.target.checked)
                        )
                      }
                      className="w-[18px] h-[18px] accent-[var(--success)] shrink-0"
                    />
                    <span
                      className={`flex-1 min-w-0 truncate text-[13.5px] ${
                        pago ? "text-[var(--text-muted)] line-through" : ""
                      }`}
                    >
                      {a.nome}
                    </span>
                    {pago && (
                      <span className="tag tag-ativo shrink-0">pago</span>
                    )}
                  </label>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
