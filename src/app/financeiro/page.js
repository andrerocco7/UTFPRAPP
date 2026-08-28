import { requireFinancePage } from "@/components/Guard";
import { query } from "@/lib/db";
import { addCharge, addExpense, deleteCharge, deleteExpense } from "@/app/actions";
import { formatBRL } from "@/lib/money";
import PaymentList from "@/components/PaymentList";

const TIPOS = [
  ["inscricao", "Inscrição"],
  ["transporte", "Transporte"],
  ["arbitragem", "Arbitragem"],
  ["material", "Material"],
  ["alimentacao", "Alimentação"],
  ["outro", "Outro"],
];

const TIPO_LABEL = Object.fromEntries(TIPOS);

export default async function FinancePage() {
  const user = await requireFinancePage();

  // Coordenador so enxerga a propria equipe; o tecnico enxerga as duas.
  const escopo = user.role === "admin" ? null : user.categoria;
  const filtro = escopo ? [escopo] : ["F", "M"];

  const { rows: charges } = await query(
    `select id, titulo, categoria, valor_centavos, vencimento
     from finance_charges
     where categoria = 'ambos' or categoria = any($1)
     order by coalesce(vencimento, current_date) desc, id desc`,
    [filtro]
  );

  const { rows: atletas } = await query(
    `select id, nome, categoria
     from people
     where role = 'athlete' and status <> 'afastado' and categoria = any($1)
     order by nome`,
    [filtro]
  );

  const { rows: pagamentos } = await query(
    "select charge_id, person_id from finance_payments"
  );

  const { rows: expenses } = await query(
    `select id, descricao, categoria, tipo, valor_centavos, data
     from finance_expenses
     where categoria = 'ambos' or categoria = any($1)
     order by data desc, id desc
     limit 50`,
    [filtro]
  );

  // Quem entra em cada cobranca depende da equipe que ela atinge.
  const atletasDa = (cat) =>
    cat === "ambos" ? atletas : atletas.filter((a) => a.categoria === cat);

  let arrecadado = 0;
  let previsto = 0;
  charges.forEach((c) => {
    const alvo = atletasDa(c.categoria);
    previsto += alvo.length * c.valor_centavos;
    const pagos = pagamentos.filter((p) => p.charge_id === c.id).length;
    arrecadado += pagos * c.valor_centavos;
  });

  const gasto = expenses.reduce((n, e) => n + e.valor_centavos, 0);
  const saldo = arrecadado - gasto;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Financeiro</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-6">
        {user.role === "admin"
          ? "Listas de pagamento e gastos das duas equipes."
          : `Listas de pagamento e gastos — ${user.categoria === "F" ? "feminino" : "masculino"}.`}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat label="Recebido" valor={formatBRL(arrecadado)} cor="var(--success)" />
        <Stat label="A receber" valor={formatBRL(previsto - arrecadado)} cor="var(--warn)" />
        <Stat label="Gastos" valor={formatBRL(gasto)} cor="var(--danger)" />
        <Stat
          label="Saldo em caixa"
          valor={formatBRL(saldo)}
          cor={saldo >= 0 ? "var(--accent)" : "var(--danger)"}
        />
      </div>

      {/* ---------- cobranças ---------- */}
      <h2 className="text-[13px] uppercase tracking-wide text-[var(--text-muted)] font-display font-semibold mb-3">
        Listas de pagamento
      </h2>

      <div className="card p-5 mb-4">
        <h3 className="font-semibold text-[13.5px] mb-3">Nova cobrança</h3>
        <form action={addCharge} className="grid md:grid-cols-4 gap-3 items-end">
          <Field label="Descrição">
            <input type="text" name="titulo" required placeholder="Ex: Inscrição JUPS" />
          </Field>
          <Field label="Valor por atleta">
            <input type="text" name="valor" required placeholder="120,00" inputMode="decimal" />
          </Field>
          <Field label="Equipe">
            <select name="categoria" defaultValue={escopo || "ambos"}>
              {(!escopo || escopo === "F") && <option value="F">Feminino</option>}
              {(!escopo || escopo === "M") && <option value="M">Masculino</option>}
              {!escopo && <option value="ambos">As duas</option>}
            </select>
          </Field>
          <Field label="Vencimento (opcional)">
            <input type="date" name="vencimento" />
          </Field>
          <div className="md:col-span-4">
            <button type="submit" className="btn btn-small">
              Criar cobrança
            </button>
          </div>
        </form>
      </div>

      {!charges.length ? (
        <div className="text-[13px] italic text-[var(--text-muted)] mb-8">
          Nenhuma cobrança criada ainda.
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-8">
          {charges.map((c) => {
            const boundDelete = deleteCharge.bind(null, c.id);
            return (
              <div key={c.id} className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <PaymentList
                    charge={c}
                    atletas={atletasDa(c.categoria)}
                    pagos={pagamentos.filter((p) => p.charge_id === c.id).map((p) => p.person_id)}
                  />
                </div>
                <form action={boundDelete} className="shrink-0 pt-4">
                  <button
                    type="submit"
                    title="Remover cobrança"
                    className="text-[var(--text-muted)] hover:text-[var(--danger)] px-1"
                  >
                    ✕
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- gastos ---------- */}
      <h2 className="text-[13px] uppercase tracking-wide text-[var(--text-muted)] font-display font-semibold mb-3">
        Gastos
      </h2>

      <div className="card p-5 mb-4">
        <h3 className="font-semibold text-[13.5px] mb-3">Novo gasto</h3>
        <form action={addExpense} className="grid md:grid-cols-4 gap-3 items-end">
          <Field label="Descrição">
            <input type="text" name="descricao" required placeholder="Ex: Van para Ponta Grossa" />
          </Field>
          <Field label="Valor">
            <input type="text" name="valor" required placeholder="450,00" inputMode="decimal" />
          </Field>
          <Field label="Tipo">
            <select name="tipo" defaultValue="outro">
              {TIPOS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Equipe">
            <select name="categoria" defaultValue={escopo || "ambos"}>
              {(!escopo || escopo === "F") && <option value="F">Feminino</option>}
              {(!escopo || escopo === "M") && <option value="M">Masculino</option>}
              {!escopo && <option value="ambos">As duas</option>}
            </select>
          </Field>
          <Field label="Data (opcional)">
            <input type="date" name="data" />
          </Field>
          <div className="md:col-span-4">
            <button type="submit" className="btn btn-small">
              Lançar gasto
            </button>
          </div>
        </form>
      </div>

      {!expenses.length ? (
        <div className="text-[13px] italic text-[var(--text-muted)]">
          Nenhum gasto lançado ainda.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Tipo</th>
                <th style={{ textAlign: "right" }}>Valor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => {
                const boundDelete = deleteExpense.bind(null, e.id);
                return (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap">
                      {new Date(e.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                    </td>
                    <td>
                      {e.descricao}
                      {e.categoria !== "ambos" && (
                        <span className={`tag ml-2 ${e.categoria === "F" ? "tag-fem" : "tag-masc"}`}>
                          {e.categoria === "F" ? "Fem" : "Masc"}
                        </span>
                      )}
                    </td>
                    <td className="text-[var(--text-muted)]">{TIPO_LABEL[e.tipo] || e.tipo}</td>
                    <td style={{ textAlign: "right" }} className="tabular-nums whitespace-nowrap">
                      {formatBRL(e.valor_centavos)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <form action={boundDelete}>
                        <button
                          type="submit"
                          title="Remover gasto"
                          className="text-[var(--text-muted)] hover:text-[var(--danger)]"
                        >
                          ✕
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, valor, cor }) {
  return (
    <div className="card p-4">
      <div
        className="font-display font-bold text-[19px] tabular-nums leading-tight"
        style={{ color: cor }}
      >
        {valor}
      </div>
      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{label}</div>
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
