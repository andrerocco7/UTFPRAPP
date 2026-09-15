import { requireSessionPage } from "@/components/Guard";
import { query } from "@/lib/db";
import {
  updateTraining,
  addTrainingLog,
  updateTrainingLog,
  deleteTrainingLog,
} from "@/app/actions";
import VideoLink from "@/components/VideoLink";

const DAY_LABEL = {
  segunda: "Segunda-feira",
  quarta: "Quarta-feira",
  sabado: "Sábado",
  sexta: "Sexta-feira",
};
const ORDER = { segunda: 0, quarta: 1, sexta: 2, sabado: 3 };

export default async function TrainingPage() {
  const user = await requireSessionPage();
  const isAdmin = user.role === "admin";

  const { rows } = await query("select categoria, dia, rotina, video_url from trainings");
  const byCategoria = { F: [], M: [] };
  rows.forEach((r) => byCategoria[r.categoria]?.push(r));
  byCategoria.F.sort((a, b) => ORDER[a.dia] - ORDER[b.dia]);
  byCategoria.M.sort((a, b) => ORDER[a.dia] - ORDER[b.dia]);

  const { rows: logRows } = await query(
    "select id, categoria, data, texto from training_logs order by data desc, id desc"
  );
  const logsByCategoria = { F: [], M: [] };
  logRows.forEach((r) => logsByCategoria[r.categoria]?.push(r));

  const visibleCategories =
    isAdmin || !user.categoria ? ["F", "M"] : [user.categoria];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Treinos</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-6">
        Rotina padrão de cada dia da semana e o diário do que rolou em cada treino, por equipe.
      </p>

      {visibleCategories.includes("F") && (
        <Group
          title="Feminino — segunda, quarta e sábado"
          days={byCategoria.F}
          logs={logsByCategoria.F}
          categoria="F"
          isAdmin={isAdmin}
          tagClass="tag-fem"
        />
      )}
      {visibleCategories.includes("M") && (
        <Group
          title="Masculino — segunda e sexta"
          days={byCategoria.M}
          logs={logsByCategoria.M}
          categoria="M"
          isAdmin={isAdmin}
          tagClass="tag-masc"
        />
      )}
    </div>
  );
}

function Group({ title, days, logs, categoria, isAdmin, tagClass }) {
  return (
    <div className="mb-10">
      <h2 className="text-[14px] font-display font-semibold mb-3">
        <span className={`tag ${tagClass} mr-1`}>{title.split(" —")[0]}</span>
        {title.split("— ")[1]}
      </h2>
      <div className="flex flex-col gap-3 mb-6">
        {days.map((d) => (
          <DayCard key={d.dia} day={d} isAdmin={isAdmin} />
        ))}
      </div>

      <TrainingLog categoria={categoria} logs={logs} isAdmin={isAdmin} />
    </div>
  );
}

function DayCard({ day, isAdmin }) {
  const boundUpdate = updateTraining.bind(null, day.categoria, day.dia);
  return (
    <div className="card p-4">
      <div className="text-[13px] font-display font-semibold uppercase tracking-wide text-[var(--accent)] mb-2">
        {DAY_LABEL[day.dia]}
      </div>
      {isAdmin ? (
        <form action={boundUpdate} className="flex flex-col gap-2">
          <textarea
            name="rotina"
            defaultValue={day.rotina}
            placeholder="Descreva a rotina exata: aquecimento, fundamentos, coletivo, arremessos, físico..."
          />
          <input
            type="url"
            name="video_url"
            defaultValue={day.video_url || ""}
            placeholder="Link de vídeo de apoio (YouTube/Vimeo) — opcional"
          />
          <button type="submit" className="btn btn-small self-start">
            Salvar
          </button>
        </form>
      ) : (
        <>
          <p className="text-[13px] whitespace-pre-wrap">
            {day.rotina || "Rotina ainda não definida pelo técnico."}
          </p>
          <VideoLink url={day.video_url} />
        </>
      )}
    </div>
  );
}

function TrainingLog({ categoria, logs, isAdmin }) {
  const today = new Date().toLocaleDateString("sv-SE"); // yyyy-mm-dd no fuso local

  return (
    <div>
      <h3 className="text-[12px] uppercase tracking-wide text-[var(--text-muted)] font-display font-semibold mb-3">
        Diário de treinos
      </h3>

      {isAdmin && (
        <form action={addTrainingLog} className="card p-4 mb-4 flex flex-col gap-2">
          <input type="hidden" name="categoria" value={categoria} />
          <label className="text-[11.5px] text-[var(--text-muted)] self-start">
            Data do treino
            <input type="date" name="data" defaultValue={today} className="block mt-1" />
          </label>
          <textarea
            name="texto"
            placeholder="O que foi feito nesse treino, quem faltou, combinados para o próximo..."
          />
          <button type="submit" className="btn btn-small self-start">
            Registrar
          </button>
        </form>
      )}

      {!logs.length ? (
        <div className="text-[13px] italic text-[var(--text-muted)]">
          Nenhum registro ainda.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((l) => {
            const boundUpdate = updateTrainingLog.bind(null, l.id);
            const boundDelete = deleteTrainingLog.bind(null, l.id);
            const isoData = new Date(l.data).toLocaleDateString("sv-SE", { timeZone: "UTC" });

            if (!isAdmin) {
              return (
                <div key={l.id} className="card p-3">
                  <div className="text-[11px] font-display font-semibold text-[var(--accent)] tabular-nums">
                    {new Date(l.data).toLocaleDateString("pt-BR", {
                      timeZone: "UTC",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </div>
                  <div className="text-[13px] whitespace-pre-wrap mt-1">{l.texto}</div>
                </div>
              );
            }

            return (
              <form key={l.id} action={boundUpdate} className="card p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <input
                    type="date"
                    name="data"
                    defaultValue={isoData}
                    className="text-[11px] tabular-nums"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="submit" className="btn btn-small">
                      Salvar
                    </button>
                    <button
                      type="submit"
                      formAction={boundDelete}
                      title="Remover registro"
                      className="text-[var(--text-muted)] hover:text-[var(--danger)] px-1 text-[12px] leading-none"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <textarea name="texto" defaultValue={l.texto} />
              </form>
            );
          })}
        </div>
      )}
    </div>
  );
}
