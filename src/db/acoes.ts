/* Todas as gravações no banco passam por aqui. As telas só leem
   (useLiveQuery) e chamam estas funções para mudar algo.
   Cada função que cria algo devolve um "desfazer", usado pelo toast. */
import { db } from "./db";
import { agora, comBase } from "../lib/id";
import { hojeISO, somarDias } from "../lib/datas";
import type { Category, Cents, ID, Idea, ImportMapping, IncomeSource, ISODate, Pillar, SavingsDeposit, Task, Transaction } from "./types";
import { importHash } from "../lib/financas";

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

/* ── Finanças ─────────────────────────────────────────────── */

export async function criarLancamento(
  dados: Omit<Transaction, "id" | "createdAt" | "updatedAt" | "origin"> & { origin?: Transaction["origin"] },
): Promise<{ lancamento: Transaction; desfazer: Desfazer }> {
  const lancamento: Transaction = comBase({ origin: "manual" as const, ...dados, description: dados.description.trim() });
  await db.transactions.add(lancamento);
  return { lancamento, desfazer: () => db.transactions.delete(lancamento.id) };
}

export async function apagarLancamento(id: ID): Promise<Desfazer> {
  const t = await db.transactions.get(id);
  await db.transactions.delete(id);
  return async () => {
    if (t) await db.transactions.add(t);
  };
}

export async function mudarCategoria(id: ID, categoryId: ID) {
  await db.transactions.update(id, { categoryId, updatedAt: agora() });
}

export async function criarRegra(contains: string, categoryId: ID) {
  const texto = contains.trim().toUpperCase();
  if (!texto) return;
  const existente = await db.categoryRules.filter((r) => r.contains.toUpperCase() === texto).first();
  if (existente) await db.categoryRules.update(existente.id, { categoryId, updatedAt: agora() });
  else await db.categoryRules.add(comBase({ contains: texto, categoryId }));
}

export async function criarAporte(goalId: ID, amount: Cents, date: ISODate = hojeISO(), note?: string): Promise<Desfazer> {
  const d: SavingsDeposit = comBase({ goalId, amount, date, note });
  await db.savingsDeposits.add(d);
  return () => db.savingsDeposits.delete(d.id);
}

/* Categoria de entrada correspondente à origem (Salário, VoIP…). */
const CATEGORIA_DA_ORIGEM: Record<IncomeSource, string> = {
  salario_1: "Salário",
  salario_2: "Salário",
  voip: "VoIP",
  freela: "Freela",
  sistema: "Sistema",
  outro: "Outras entradas",
};

export async function categoriaPorNome(nome: string, tipo: Category["type"]) {
  const achada = await db.categories.where("name").equals(nome).first();
  if (achada) return achada.id;
  const nova: Category = comBase({ name: nome, type: tipo, color: "#9AA2B1" });
  await db.categories.add(nova);
  return nova.id;
}

export const categoriaDaOrigem = (s: IncomeSource) => categoriaPorNome(CATEGORIA_DA_ORIGEM[s], "entrada");
export const semCategoria = (tipo: Category["type"]) =>
  categoriaPorNome(tipo === "saida" ? "Sem categoria" : "Outras entradas", tipo);

/* As categorias de saída mais usadas nos últimos 90 dias; completa
   com as demais na ordem padrão. */
export async function categoriasMaisUsadas(n = 6): Promise<Category[]> {
  const cats = (await db.categories.where("type").equals("saida").toArray())
    .filter((c) => c.name !== "Sem categoria")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const desde = somarDias(hojeISO(), -90);
  const uso = new Map<ID, number>();
  await db.transactions
    .where("date")
    .aboveOrEqual(desde)
    .each((t) => {
      if (t.amount < 0) uso.set(t.categoryId, (uso.get(t.categoryId) ?? 0) + 1);
    });
  return cats
    .map((c, i) => ({ c, i, u: uso.get(c.id) ?? 0 }))
    .sort((a, b) => b.u - a.u || a.i - b.i)
    .slice(0, n)
    .map((x) => x.c);
}

/* Importa as linhas aprovadas na prévia. Linhas cujo importHash já
   existe no banco são puladas (segurança extra contra duplicata). */
export async function importarLinhas(linhas: { date: ISODate; amount: Cents; description: string; categoryId: ID }[]) {
  const existentes = new Set(
    (await db.transactions.where("importHash").anyOf(linhas.map((l) => importHash(l.date, l.amount, l.description))).toArray()).map(
      (t) => t.importHash,
    ),
  );
  const novas: Transaction[] = [];
  for (const l of linhas) {
    const h = importHash(l.date, l.amount, l.description);
    if (existentes.has(h)) continue;
    existentes.add(h);
    novas.push(comBase({ ...l, origin: "import" as const, importHash: h }));
  }
  await db.transactions.bulkAdd(novas);
  return novas.length;
}

export async function salvarMapeamento(m: Omit<ImportMapping, "id" | "createdAt" | "updatedAt">) {
  const existente = await db.importMappings.where("bankName").equals(m.bankName).first();
  if (existente) await db.importMappings.update(existente.id, { ...m, updatedAt: agora() });
  else await db.importMappings.add(comBase(m));
}
