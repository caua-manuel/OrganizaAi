/* Editar uma tarefa: título, pilar, prazo, dia planejado, repetição,
   notas (e, no trabalho, tipo e área). Salva só ao confirmar. */
import { useState } from "react";
import { apagarTarefa, atualizarTarefa } from "../../db/acoes";
import { useSettings } from "../../db/hooks";
import { PILARES } from "../../db/types";
import type { Pillar, Repeticao, Task } from "../../db/types";
import { hojeISO } from "../../lib/datas";
import { Modal } from "../../ui/Modal";
import { useToast } from "../../ui/Toast";
import { Botao, Chip, corPilar } from "../../ui/ui";

export function CamposRepeticao({ valor, onChange }: { valor?: Repeticao; onChange: (r?: Repeticao) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor="rep-ativa" className="flex items-center gap-2">
        <input
          id="rep-ativa"
          type="checkbox"
          checked={!!valor}
          onChange={(e) => onChange(e.target.checked ? { cada: 1, unidade: "semana" } : undefined)}
        />
        Repetir
      </label>
      {valor && (
        <>
          <span className="text-lapis">a cada</span>
          <input
            aria-label="Intervalo"
            type="number"
            min={1}
            max={365}
            className="campo num w-16 py-1"
            value={valor.cada}
            onChange={(e) => onChange({ ...valor, cada: Math.max(1, Math.round(Number(e.target.value) || 1)) })}
          />
          <select
            aria-label="Unidade"
            className="campo w-auto py-1"
            value={valor.unidade}
            onChange={(e) => onChange({ ...valor, unidade: e.target.value as Repeticao["unidade"] })}
          >
            <option value="dia">{valor.cada === 1 ? "dia" : "dias"}</option>
            <option value="semana">{valor.cada === 1 ? "semana" : "semanas"}</option>
            <option value="mes">{valor.cada === 1 ? "mês" : "meses"}</option>
          </select>
        </>
      )}
    </div>
  );
}

export function EditorTarefa({ tarefa, onFechar }: { tarefa: Task; onFechar: () => void }) {
  const { workAreas } = useSettings();
  const avisar = useToast();
  const [t, setT] = useState<Task>(tarefa);
  const muda = (m: Partial<Task>) => setT({ ...t, ...m });

  async function salvar() {
    if (!t.title.trim()) return;
    const { title, pillar, dueDate, plannedFor, repeat, notes, kind, workArea } = t;
    await atualizarTarefa(tarefa.id, {
      title: title.trim(),
      pillar,
      dueDate: dueDate || undefined,
      plannedFor: plannedFor || undefined,
      repeat,
      notes: notes?.trim() || undefined,
      kind: pillar === "trabalho" ? (kind ?? "novo") : kind,
      workArea: pillar === "trabalho" ? workArea || undefined : workArea,
    });
    avisar("Tarefa atualizada");
    onFechar();
  }

  return (
    <Modal titulo="Editar tarefa" onFechar={onFechar}>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          salvar();
        }}
      >
        <div>
          <label className="rotulo" htmlFor="ed-titulo">
            Tarefa
          </label>
          <input id="ed-titulo" className="campo" maxLength={80} value={t.title} onChange={(e) => muda({ title: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pilar">
          {PILARES.map((p) => (
            <Chip key={p.id} ativo={t.pillar === p.id} cor={corPilar(p.id)} onClick={() => muda({ pillar: t.pillar === p.id ? null : (p.id as Pillar) })}>
              {p.nome}
            </Chip>
          ))}
        </div>
        {t.pillar === "trabalho" && (
          <div className="grid grid-cols-2 gap-3">
            <select aria-label="Tipo" className="campo" value={t.kind ?? "novo"} onChange={(e) => muda({ kind: e.target.value as Task["kind"] })}>
              <option value="acumulado">Acumulado</option>
              <option value="novo">Novo</option>
            </select>
            <select aria-label="Área" className="campo" value={t.workArea ?? ""} onChange={(e) => muda({ workArea: e.target.value })}>
              <option value="">Sem área</option>
              {workAreas.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="rotulo" htmlFor="ed-prazo">
              Prazo
            </label>
            <input id="ed-prazo" type="date" className="campo" value={t.dueDate ?? ""} onChange={(e) => muda({ dueDate: e.target.value })} />
          </div>
          <div>
            <label className="rotulo" htmlFor="ed-dia">
              Fazer no dia{" "}
              {t.plannedFor !== hojeISO() && (
                <button type="button" className="text-grafite underline" onClick={() => muda({ plannedFor: hojeISO() })}>
                  hoje
                </button>
              )}
            </label>
            <input id="ed-dia" type="date" className="campo" value={t.plannedFor ?? ""} onChange={(e) => muda({ plannedFor: e.target.value })} />
          </div>
        </div>
        <CamposRepeticao valor={t.repeat} onChange={(repeat) => muda({ repeat })} />
        <div>
          <label className="rotulo" htmlFor="ed-notas">
            Notas
          </label>
          <textarea id="ed-notas" rows={3} className="campo" value={t.notes ?? ""} onChange={(e) => muda({ notes: e.target.value })} />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <Botao
            variante="perigo"
            onClick={async () => {
              const desfazer = await apagarTarefa(tarefa.id);
              avisar("Tarefa apagada", desfazer);
              onFechar();
            }}
          >
            Apagar
          </Botao>
          <div className="flex gap-2">
            <Botao variante="fantasma" onClick={onFechar}>
              Cancelar
            </Botao>
            <Botao type="submit" variante="primario" disabled={!t.title.trim()}>
              Salvar
            </Botao>
          </div>
        </div>
      </form>
    </Modal>
  );
}
