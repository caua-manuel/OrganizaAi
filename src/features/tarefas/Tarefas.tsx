/* Tarefas: tudo que está em aberto, agrupado por data, para nenhuma
   tarefa ficar "invisível" (sem dia, de outro pilar, que não coube
   hoje). Clique na tarefa para editar. */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CalendarPlus, Repeat } from "lucide-react";
import { db } from "../../db/db";
import { alternarTarefa, criarTarefa, puxarParaHoje } from "../../db/acoes";
import { PILARES, nomePilar } from "../../db/types";
import type { Pillar, Task } from "../../db/types";
import { fmtData, hojeISO } from "../../lib/datas";
import { agruparTarefas, NOMES_GRUPO, textoRepeticao } from "../../lib/tarefas";
import type { Grupo } from "../../lib/tarefas";
import { useToast } from "../../ui/Toast";
import { Cabecalho, Chip, Etiqueta, Painel, Vazio, corPilar } from "../../ui/ui";
import { EditorTarefa } from "./EditorTarefa";

const ORDEM: Grupo[] = ["atrasadas", "hoje", "proximos", "depois", "semData"];

export function Tarefas() {
  const todas = useLiveQuery(() => db.tasks.filter((t) => !t.doneAt).toArray(), []);
  const projetos = useLiveQuery(() => db.projects.toArray(), []) ?? [];
  const [pilar, setPilar] = useState<Pillar | "nenhum" | null>(null);
  const [editando, setEditando] = useState<Task | null>(null);
  const [nova, setNova] = useState("");
  const avisar = useToast();
  if (!todas) return null;

  const hoje = hojeISO();
  const filtradas = todas.filter((t) => pilar === null || (pilar === "nenhum" ? !t.pillar : t.pillar === pilar));
  const grupos = agruparTarefas(filtradas, hoje);
  const nomeProjeto = new Map(projetos.map((p) => [p.id, p.name]));

  return (
    <>
      <Cabecalho titulo="Tarefas" sub={`${todas.length} em aberto. Clique numa tarefa para editar.`} />
      <div className="grid gap-4">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!nova.trim()) return;
            await criarTarefa({ title: nova, pillar: pilar && pilar !== "nenhum" ? pilar : null });
            setNova("");
          }}
        >
          <label htmlFor="nova-tarefa" className="sr-only">
            Nova tarefa
          </label>
          <input id="nova-tarefa" className="campo" placeholder="Nova tarefa sem data e Enter (edite depois para dar prazo)" value={nova} maxLength={80} onChange={(e) => setNova(e.target.value)} />
        </form>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por pilar">
          <Chip ativo={pilar === null} onClick={() => setPilar(null)}>
            Todas
          </Chip>
          {PILARES.map((p) => (
            <Chip key={p.id} ativo={pilar === p.id} cor={corPilar(p.id)} onClick={() => setPilar(pilar === p.id ? null : p.id)}>
              {p.nome}
            </Chip>
          ))}
          <Chip ativo={pilar === "nenhum"} onClick={() => setPilar(pilar === "nenhum" ? null : "nenhum")}>
            Sem pilar
          </Chip>
        </div>

        {filtradas.length === 0 && (
          <Painel>
            <Vazio>Nenhuma tarefa em aberto aqui. Crie uma acima ou com +.</Vazio>
          </Painel>
        )}

        {ORDEM.filter((g) => grupos[g].length).map((g) => (
          <Painel key={g} titulo={`${NOMES_GRUPO[g]} · ${grupos[g].length}`}>
            <ul className="divide-y divide-linha">
              {grupos[g].map((t) => (
                <li key={t.id} className="flex items-center gap-2 py-1.5">
                  <input
                    type="checkbox"
                    aria-label={`Concluir ${t.title}`}
                    className="size-4 shrink-0 cursor-pointer"
                    style={{ accentColor: corPilar(t.pillar) ?? "var(--cor-grafite)" }}
                    checked={false}
                    onChange={async () => {
                      const { proxima } = await alternarTarefa(t.id);
                      avisar(proxima ? `Concluída · próxima em ${fmtData((proxima.dueDate ?? proxima.plannedFor)!)}` : "Concluída", async () => {
                        await alternarTarefa(t.id);
                        if (proxima) await db.tasks.delete(proxima.id);
                      });
                    }}
                  />
                  <button type="button" onClick={() => setEditando(t)} className="min-w-0 flex-1 truncate text-left text-sm hover:underline" title={t.notes || t.title}>
                    {t.title}
                    {t.projectId && <span className="text-lapis"> · {nomeProjeto.get(t.projectId)}</span>}
                  </button>
                  {t.repeat && (
                    <span className="flex items-center gap-1 text-xs text-lapis" title={textoRepeticao(t.repeat)}>
                      <Repeat size={12} aria-hidden="true" />
                      <span className="hidden sm:inline">{textoRepeticao(t.repeat)}</span>
                    </span>
                  )}
                  {t.dueDate && <span className="text-xs text-lapis">prazo {fmtData(t.dueDate, "dd/MM")}</span>}
                  {t.plannedFor && t.plannedFor !== hoje && !t.dueDate && <span className="text-xs text-lapis">{fmtData(t.plannedFor, "dd/MM")}</span>}
                  {t.pillar && <Etiqueta cor={corPilar(t.pillar)}>{nomePilar(t.pillar)}</Etiqueta>}
                  {t.plannedFor !== hoje && (
                    <button
                      type="button"
                      title="Fazer hoje"
                      aria-label={`Fazer hoje: ${t.title}`}
                      className="rounded-lg p-1.5 text-lapis hover:bg-papel hover:text-grafite"
                      onClick={async () => avisar((await puxarParaHoje(t.id)) ? "Está nas tarefas de hoje" : "O dia já tem 5 tarefas")}
                    >
                      <CalendarPlus size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Painel>
        ))}
      </div>
      {editando && <EditorTarefa tarefa={editando} onFechar={() => setEditando(null)} />}
    </>
  );
}
