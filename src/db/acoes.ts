/* Todas as gravações no banco passam por aqui. As telas só leem
   (useLiveQuery) e chamam estas funções para mudar algo.
   Cada função que cria algo devolve um "desfazer", usado pelo toast. */
import { db } from "./db";
import { agora, comBase } from "../lib/id";
import { hojeISO, somarDias } from "../lib/datas";
import type { ID, Idea, Pillar, Task } from "./types";

export type Desfazer = () => Promise<unknown>;

export const LIMITE_TAREFAS_DIA = 5;

/* ── Tarefas ───────────────────────────────────────────────── */

export async function tarefasPlanejadas(dia: string) {
  return db.tasks.where("plannedFor").equals(dia).count();
}

/* Cria a tarefa. Se pedirem "para hoje" e o dia já estiver cheio,
   ela fica sem dia — e `cabeHoje` avisa a tela disso. */
export async function criarTarefa(
  dados: Partial<Omit<Task, "id" | "createdAt" | "updatedAt">> & { title: string },
): Promise<{ tarefa: Task; cabeHoje: boolean; desfazer: Desfazer }> {
  let cabeHoje = true;
  const d = { ...dados };
  if (d.plannedFor === hojeISO() && (await tarefasPlanejadas(d.plannedFor)) >= LIMITE_TAREFAS_DIA) {
    cabeHoje = false;
    delete d.plannedFor;
  }
  const tarefa = comBase({ pillar: null, ...d, title: d.title.trim() }) as Task;
  await db.tasks.add(tarefa);
  return { tarefa, cabeHoje, desfazer: () => db.tasks.delete(tarefa.id) };
}

export async function alternarTarefa(id: ID) {
  const t = await db.tasks.get(id);
  if (!t) return;
  await db.tasks.update(id, { doneAt: t.doneAt ? undefined : agora(), updatedAt: agora() });
}

export async function atualizarTarefa(id: ID, mudanca: Partial<Task>) {
  await db.tasks.update(id, { ...mudanca, updatedAt: agora() });
}

export async function apagarTarefa(id: ID): Promise<Desfazer> {
  const t = await db.tasks.get(id);
  await db.tasks.delete(id);
  return async () => {
    if (t) await db.tasks.add(t);
  };
}

/* Traz para hoje; devolve false se o dia já está cheio. */
export async function puxarParaHoje(id: ID) {
  const hoje = hojeISO();
  if ((await tarefasPlanejadas(hoje)) >= LIMITE_TAREFAS_DIA) return false;
  await atualizarTarefa(id, { plannedFor: hoje });
  return true;
}

/* Sugestões para o botão "Puxar tarefas": atrasadas (planejadas para
   um dia que já passou e não feitas) e com prazo nos próximos 3 dias. */
export async function sugestoesParaHoje(): Promise<{ tarefa: Task; motivo: string }[]> {
  const hoje = hojeISO();
  const abertas = await db.tasks.filter((t) => !t.doneAt && t.plannedFor !== hoje).toArray();
  const limite = somarDias(hoje, 3);
  const saida: { tarefa: Task; motivo: string }[] = [];
  for (const t of abertas) {
    if (t.plannedFor && t.plannedFor < hoje) saida.push({ tarefa: t, motivo: "ficou de outro dia" });
    else if (t.dueDate && t.dueDate <= limite) saida.push({ tarefa: t, motivo: t.dueDate < hoje ? "prazo passou" : "prazo próximo" });
  }
  return saida.sort((a, b) => (a.tarefa.dueDate ?? "9999").localeCompare(b.tarefa.dueDate ?? "9999"));
}

/* ── Ideias ───────────────────────────────────────────────── */

export async function criarIdeia(texto: string): Promise<Desfazer> {
  const ideia: Idea = comBase({ text: texto.trim(), status: "inbox" as const });
  await db.ideas.add(ideia);
  return () => db.ideas.delete(ideia.id);
}

/* Ideia vira tarefa (para hoje, se couber). A ideia fica marcada
   como "movida" apontando para a tarefa: dá para rastrear a origem. */
export async function ideiaParaTarefa(id: ID, pillar: Pillar | null = null) {
  const ideia = await db.ideas.get(id);
  if (!ideia) return;
  const { tarefa, cabeHoje } = await criarTarefa({ title: ideia.text, pillar, plannedFor: hojeISO() });
  await db.ideas.update(id, { status: "movida", movedTo: { type: "task", id: tarefa.id }, updatedAt: agora() });
  return { cabeHoje };
}

export async function ideiaParaProjeto(id: ID, projectId: ID) {
  const ideia = await db.ideas.get(id);
  if (!ideia) return;
  await db.ideas.update(id, { status: "movida", movedTo: { type: "project", id: projectId }, updatedAt: agora() });
}

export async function descartarIdeia(id: ID): Promise<Desfazer> {
  await db.ideas.update(id, { status: "descartada", updatedAt: agora() });
  return () => db.ideas.update(id, { status: "inbox", updatedAt: agora() });
}
