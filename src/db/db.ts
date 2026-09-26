/* Banco local do app: IndexedDB, via Dexie.
   Cada tabela abaixo é uma "gaveta" de registros. A string de cada
   uma lista os campos indexados (os que usamos para buscar/filtrar);
   o primeiro é a chave. Os outros campos são guardados do mesmo jeito,
   só não dá para buscar direto por eles.

   Todas as tabelas do modelo já existem desde a versão 1, para as
   próximas fases não precisarem de migração. */
import Dexie, { type EntityTable } from "dexie";
import type {
  Assessment,
  Category,
  CategoryRule,
  Course,
  FocusSession,
  Goal,
  Habit,
  HabitLog,
  Idea,
  ImportMapping,
  Project,
  SavingsDeposit,
  SavingsGoal,
  Settings,
  Subject,
  Task,
  Transaction,
  WeeklyReview,
  Workout,
} from "./types";
import { popular } from "./seed";

export class OrganizaDB extends Dexie {
  tasks!: EntityTable<Task, "id">;
  ideas!: EntityTable<Idea, "id">;
  goals!: EntityTable<Goal, "id">;
  habits!: EntityTable<Habit, "id">;
  habitLogs!: EntityTable<HabitLog, "id">;
  transactions!: EntityTable<Transaction, "id">;
  categories!: EntityTable<Category, "id">;
  categoryRules!: EntityTable<CategoryRule, "id">;
  savingsGoals!: EntityTable<SavingsGoal, "id">;
  savingsDeposits!: EntityTable<SavingsDeposit, "id">;
  importMappings!: EntityTable<ImportMapping, "id">;
  subjects!: EntityTable<Subject, "id">;
  assessments!: EntityTable<Assessment, "id">;
  courses!: EntityTable<Course, "id">;
  projects!: EntityTable<Project, "id">;
  focusSessions!: EntityTable<FocusSession, "id">;
  workouts!: EntityTable<Workout, "id">;
  weeklyReviews!: EntityTable<WeeklyReview, "id">;
  settings!: EntityTable<Settings, "id">;

  constructor(nome = "organizaai") {
    super(nome);
    this.version(1).stores({
      tasks: "id, plannedFor, pillar, projectId, dueDate, doneAt, kind, createdAt",
      ideas: "id, status, createdAt",
      goals: "id, pillar",
      habits: "id, pillar, link",
      habitLogs: "id, habitId, date",
      transactions: "id, date, categoryId, source, importHash",
      categories: "id, type, name",
      categoryRules: "id, categoryId",
      savingsGoals: "id",
      savingsDeposits: "id, goalId, date",
      importMappings: "id, bankName",
      subjects: "id, status",
      assessments: "id, subjectId, date",
      courses: "id",
      projects: "id, status",
      focusSessions: "id, pillar, projectId, date",
      workouts: "id, date, type",
      weeklyReviews: "id, weekStart",
      settings: "id",
    });
    /* roda uma única vez, quando o banco é criado do zero */
    this.on("populate", (tx) => popular(tx));
  }
}

export const db = new OrganizaDB();

/* Nomes de todas as tabelas: usado pelo backup. */
export const TABELAS = db.tables.map((t) => t.name);
