/* Todas as gravações no banco passam por aqui. As telas só leem
   (useLiveQuery) e chamam estas funções para mudar algo.
   Cada função que cria algo devolve um "desfazer", usado pelo toast. */
import { db } from "./db";
import { agora, comBase } from "../lib/id";
import { hojeISO, somarDias } from "../lib/datas";
import type {
  Category,
  Cents,
  FocusSession,
  Habit,
  HabitLog,
  ID,
  Idea,
  ImportMapping,
  IncomeSource,
  ISODate,
  Pillar,
  SavingsDeposit,
  Task,
  Transaction,
  Workout,
  WeeklyReview,
  Project,
  Subject,
  Assessment,
} from "./types";
import { importHash, ordenarRegras } from "../lib/financas";
import { proximaOcorrencia } from "../lib/tarefas";

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

/* Marca/desmarca. Ao CONCLUIR uma tarefa que se repete, cria a
   próxima ocorrência (e devolve, para o "desfazer" poder apagá-la). */
export async function alternarTarefa(id: ID): Promise<{ proxima?: Task }> {
  const t = await db.tasks.get(id);
  if (!t) return {};
  const concluindo = !t.doneAt;
  await db.tasks.update(id, { doneAt: concluindo ? agora() : undefined, updatedAt: agora() });
  if (!concluindo || !t.repeat) return {};
  const datas = proximaOcorrencia(t, hojeISO());
  if (!datas) return {};
  const { id: _id, createdAt: _c, updatedAt: _u, doneAt: _d, ...resto } = t;
  const proxima = comBase({ ...resto, ...datas }) as Task;
  await db.tasks.add(proxima);
  return { proxima };
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
  else {
    /* regra nova entra no fim da fila de prioridade */
    const ultima = Math.max(0, ...(await db.categoryRules.toArray()).map((r) => r.priority ?? 0));
    await db.categoryRules.add(comBase({ contains: texto, categoryId, priority: ultima + 1 }));
  }
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

/* ── Saúde e hábitos ──────────────────────────────────────── */

export async function registrarTreino(type: Workout["type"], date: ISODate = hojeISO(), focus?: string): Promise<Desfazer> {
  const w: Workout = comBase({ type, date, focus });
  await db.workouts.add(w);
  return () => db.workouts.delete(w.id);
}

export async function apagarTreino(id: ID): Promise<Desfazer> {
  const w = await db.workouts.get(id);
  await db.workouts.delete(id);
  return async () => {
    if (w) await db.workouts.add(w);
  };
}

/* Registro manual de um hábito sem vínculo (ex.: refeição em casa). */
export async function registrarHabito(habitId: ID, amount = 1, date: ISODate = hojeISO()): Promise<Desfazer> {
  const l: HabitLog = comBase({ habitId, amount, date });
  await db.habitLogs.add(l);
  return () => db.habitLogs.delete(l.id);
}

export async function atualizarHabito(id: ID, mudanca: Partial<Habit>) {
  await db.habits.update(id, { ...mudanca, updatedAt: agora() });
}

/* ── Foco (projetos e estudos) ───────────────────────────── */

export async function registrarFoco(
  pillar: FocusSession["pillar"],
  minutes: number,
  projectId?: ID,
  date: ISODate = hojeISO(),
): Promise<Desfazer> {
  const f: FocusSession = comBase({ pillar, minutes, projectId, date });
  await db.focusSessions.add(f);
  return () => db.focusSessions.delete(f.id);
}

/* ── Projetos ─────────────────────────────────────────────── */

export async function criarProjeto(name: string, nextStep?: string) {
  const p: Project = comBase({ name: name.trim(), status: "ativo" as const, nextStep: nextStep?.trim() || undefined });
  await db.projects.add(p);
  return p;
}

export async function atualizarProjeto(id: ID, mudanca: Partial<Project>) {
  await db.projects.update(id, { ...mudanca, updatedAt: agora() });
}

/* ── Estudos ──────────────────────────────────────────────── */

export async function criarMateria(dados: Omit<Subject, "id" | "createdAt" | "updatedAt">) {
  await db.subjects.add(comBase({ ...dados, name: dados.name.trim() }));
}

export async function atualizarMateria(id: ID, mudanca: Partial<Subject>) {
  await db.subjects.update(id, { ...mudanca, updatedAt: agora() });
}

export async function apagarMateria(id: ID) {
  await db.transaction("rw", db.subjects, db.assessments, async () => {
    await db.assessments.where("subjectId").equals(id).delete();
    await db.subjects.delete(id);
  });
}

export async function criarAvaliacao(dados: Omit<Assessment, "id" | "createdAt" | "updatedAt">) {
  await db.assessments.add(comBase({ ...dados, title: dados.title.trim() }));
}

export async function atualizarAvaliacao(id: ID, mudanca: Partial<Assessment>) {
  await db.assessments.update(id, { ...mudanca, updatedAt: agora() });
}

export async function apagarAvaliacao(id: ID) {
  await db.assessments.delete(id);
}

export async function criarCurso(name: string, totalLessons: number) {
  await db.courses.add(comBase({ name: name.trim(), totalLessons, doneLessons: 0, startedAt: hojeISO() }));
}

/* +1 aula; ao chegar na última, o curso fica concluído hoje. */
export async function maisUmaAula(id: ID, passo = 1) {
  const c = await db.courses.get(id);
  if (!c) return;
  const feitas = Math.max(0, Math.min(c.totalLessons, c.doneLessons + passo));
  await db.courses.update(id, {
    doneLessons: feitas,
    finishedAt: feitas >= c.totalLessons ? (c.finishedAt ?? hojeISO()) : undefined,
    updatedAt: agora(),
  });
}

/* ── Revisão semanal ──────────────────────────────────────── */

/* Uma revisão por semana: salvar de novo atualiza a mesma. */
export async function salvarRevisao(dados: Omit<WeeklyReview, "id" | "createdAt" | "updatedAt">) {
  const existente = await db.weeklyReviews.where("weekStart").equals(dados.weekStart).first();
  if (existente) await db.weeklyReviews.update(existente.id, { ...dados, updatedAt: agora() });
  else await db.weeklyReviews.add(comBase(dados));
}

/* ── Fase 6: correções de finanças e configurações ────────── */

export async function apagarAporte(id: ID): Promise<Desfazer> {
  const d = await db.savingsDeposits.get(id);
  await db.savingsDeposits.delete(id);
  return async () => {
    if (d) await db.savingsDeposits.add(d);
  };
}

export async function atualizarLancamento(id: ID, mudanca: Partial<Pick<Transaction, "amount" | "description" | "date" | "categoryId">>) {
  await db.transactions.update(id, { ...mudanca, updatedAt: agora() });
}

/* Categorias que o app usa como padrão não podem ser apagadas. */
export const CATEGORIAS_SISTEMA = ["Sem categoria", "Outras entradas"];

/* Apaga a categoria: os lançamentos dela vão para a categoria padrão
   do mesmo tipo e as regras que apontavam para ela somem. Devolve
   quantos lançamentos foram movidos. */
export async function apagarCategoria(id: ID): Promise<number> {
  const c = await db.categories.get(id);
  if (!c || CATEGORIAS_SISTEMA.includes(c.name)) return 0;
  const destino = await semCategoria(c.type);
  return db.transaction("rw", db.categories, db.categoryRules, db.transactions, async () => {
    const movidos = await db.transactions.where("categoryId").equals(id).modify({ categoryId: destino, updatedAt: agora() });
    await db.categoryRules.where("categoryId").equals(id).delete();
    await db.categories.delete(id);
    return movidos;
  });
}

/* Sobe (-1) ou desce (+1) uma regra na ordem de prioridade e
   renumera todas de 1 em diante. */
export async function moverRegra(id: ID, direcao: -1 | 1) {
  const regras = ordenarRegras(await db.categoryRules.toArray());
  const i = regras.findIndex((r) => r.id === id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= regras.length) return;
  [regras[i], regras[j]] = [regras[j], regras[i]];
  await db.transaction("rw", db.categoryRules, async () => {
    for (let k = 0; k < regras.length; k++) await db.categoryRules.update(regras[k].id, { priority: k + 1 });
  });
}
