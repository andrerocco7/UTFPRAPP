"use client";

import { useActionState, useRef, useState } from "react";
import { addAthlete } from "@/app/actions";

// Cadastro de atleta. Sem e-mail = atleta externa: o técnico recebe na hora o
// link de acesso dela (sem prazo, sem Google) para copiar e mandar.
export default function AddAthleteForm() {
  const formRef = useRef(null);
  const [copiado, setCopiado] = useState(false);
  const [estado, action, pendente] = useActionState(async (prev, fd) => {
    const r = await addAthlete(prev, fd);
    if (r?.ok) formRef.current?.reset();
    return r;
  }, null);
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
    <div className="card p-5 mb-8">
      <h3 className="font-semibold text-[13.5px] mb-1">Adicionar atleta</h3>
      <p className="text-[12px] text-[var(--text-muted)] mb-3">
        Com e-mail da UTFPR, ela entra pelo Google. <strong>Sem e-mail</strong> (atleta externa), o
        link de acesso dela aparece aqui na hora — sem prazo e sem precisar de conta Google.
      </p>
      <form
        ref={formRef}
        action={(fd) => {
          setCopiado(false);
          return action(fd);
        }}
        className="grid md:grid-cols-3 gap-3"
      >
        <Field label="Nome">
          <input type="text" name="nome" required />
        </Field>
        <Field label="E-mail UTFPR (deixe vazio se for externa)">
          <input type="email" name="email" placeholder="nome@alunos.utfpr.edu.br" />
        </Field>
        <Field label="Categoria">
          <select name="categoria" defaultValue="F">
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
          </select>
        </Field>
        <Field label="Curso">
          <input type="text" name="curso" placeholder="Ex: Engenharia Civil" />
        </Field>
        <Field label="Posição">
          <input type="text" name="posicao" placeholder="Ex: Armadora, Ala-pivô" />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue="ativo">
            <option value="ativo">Ativo</option>
            <option value="observacao">Em observação</option>
            <option value="lesionado">Lesionado</option>
            <option value="afastado">Afastado</option>
          </select>
        </Field>
        <div className="md:col-span-3">
          <button type="submit" className="btn" disabled={pendente}>
            {pendente ? "Salvando…" : "Adicionar atleta"}
          </button>
        </div>
      </form>

      {estado?.erro && (
        <div className="mt-3 text-[12.5px] rounded-lg px-3 py-2 bg-[var(--danger-soft)] text-[var(--danger)]">
          {estado.erro}
        </div>
      )}
      {estado?.ok && !url && (
        <div className="mt-3 text-[12.5px] rounded-lg px-3 py-2 bg-[var(--success-soft)] text-[var(--success)]">
          {estado.nome} cadastrada. {estado.aviso || ""}
        </div>
      )}
      {url && (
        <div className="mt-4 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] p-3">
          <div className="text-[13px] font-semibold mb-1">
            {estado.nome} cadastrada — link de acesso dela
          </div>
          <div className="text-[12px] text-[var(--text-muted)] mb-2">
            Mande este link para ela: abre o painel como atleta, sem Google e sem prazo (vale até
            você desativar em Acessos). Copie agora — ele não aparece de novo.
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

function Field({ label, children }) {
  return (
    <label className="block text-[11.5px] text-[var(--text-muted)]">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
