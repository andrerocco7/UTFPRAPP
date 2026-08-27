import { requireSessionPage } from "@/components/Guard";
import { query } from "@/lib/db";
import { updateTraining } from "@/app/actions";
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

  const visibleCategories =
    isAdmin || !user.categoria ? ["F", "M"] : [user.categoria];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Treinos</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-6">
        Rotina exata de cada dia de treino, por equipe.
      </p>

      {visibleCategories.includes("F") && (
        <Group
          title="Feminino — segunda, quarta e sábado"
          days={byCategoria.F}
          isAdmin={isAdmin}
          tagClass="tag-fem"
        />
      )}
      {visibleCategories.includes("M") && (
        <Group
          title="Masculino — segunda e sexta"
          days={byCategoria.M}
          isAdmin={isAdmin}
          tagClass="tag-masc"
        />
      )}
    </div>
  );
}

function Group({ title, days, isAdmin, tagClass }) {
  return (
    <div className="mb-8">
      <h2 className="text-[14px] font-display font-semibold mb-3">
        <span className={`tag ${tagClass} mr-1`}>{title.split(" —")[0]}</span>
        {title.split("— ")[1]}
      </h2>
      <div className="flex flex-col gap-3">
        {days.map((d) => (
          <DayCard key={d.dia} day={d} isAdmin={isAdmin} />
        ))}
      </div>
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
