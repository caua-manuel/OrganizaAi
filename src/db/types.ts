/* Modelo de dados do app (seção 5 do BRIEFING).
   Dinheiro sempre em centavos inteiros; datas do dia como 'YYYY-MM-DD'. */

export type ID = string;
export type Cents = number;
export type ISODate = string;

export type Pillar = "financas" | "trabalho" | "projetos" | "estudos" | "saude";

export const PILARES: { id: Pillar; nome: string }[] = [
  { id: "financas", nome: "Finanças" },
  { id: "trabalho", nome: "Trabalho" },
  { id: "projetos", nome: "Projetos" },
  { id: "estudos", nome: "Estudos" },
  { id: "saude", nome: "Saúde" },
];

export const nomePilar = (p: Pillar) => PILARES.find((x) => x.id === p)?.nome ?? p;

export interface Base {
  id: ID;
  createdAt: string;
  updatedAt: string;
}

// ---------- Geral ----------
export interface Task extends Base {
  title: string;
  pillar: Pillar | null;
  projectId?: ID;
  kind?: "acumulado" | "novo";
  workArea?: string;
  dueDate?: ISODate;
  plannedFor?: ISODate;
  doneAt?: string;
}

export interface Idea extends Base {
  text: string;
  status: "inbox" | "movida" | "descartada";
  movedTo?: { type: "task" | "project"; id: ID };
}

export interface Goal extends Base {
  pillar: Pillar;
  title: string;
  targetValue?: number;
  unit?: string;
  deadline?: ISODate;
  achievedAt?: string;
}

/* `link` diz qual registro automático alimenta o hábito:
   um Workout de academia conta para o hábito com link 'treino:academia',
   uma sessão de foco em projeto conta para 'foco:projetos'. */
export type HabitLink = "treino:academia" | "treino:jiujitsu" | "foco:projetos" | "foco:estudos";

export interface Habit extends Base {
  pillar: Pillar;
  title: string;
  weeklyTarget: number;
  unit: "vezes" | "minutos";
  active: boolean;
  link?: HabitLink;
}

export interface HabitLog extends Base {
  habitId: ID;
  date: ISODate;
  amount: number;
  note?: string;
}

// ---------- Finanças ----------
export type IncomeSource = "salario_1" | "salario_2" | "voip" | "freela" | "sistema" | "outro";

export const ORIGENS: { id: IncomeSource; nome: string }[] = [
  { id: "salario_1", nome: "Salário 1" },
  { id: "salario_2", nome: "Salário 2" },
  { id: "voip", nome: "VoIP" },
  { id: "freela", nome: "Freela" },
  { id: "sistema", nome: "Sistema" },
  { id: "outro", nome: "Outro" },
];

export const nomeOrigem = (s?: IncomeSource) => ORIGENS.find((x) => x.id === s)?.nome ?? "—";

export interface Transaction extends Base {
  date: ISODate;
  amount: Cents;
  description: string;
  categoryId: ID;
  source?: IncomeSource;
  origin: "manual" | "import";
  importHash?: string;
}

export interface Category extends Base {
  name: string;
  type: "entrada" | "saida";
  weeklyLimit?: Cents;
  color: string;
}

export interface CategoryRule extends Base {
  contains: string;
  categoryId: ID;
}

export interface SavingsGoal extends Base {
  name: string;
  targetAmount: Cents;
  deadline?: ISODate;
  autoTarget?: { monthsOfExpenses: number };
}

export interface SavingsDeposit extends Base {
  goalId: ID;
  date: ISODate;
  amount: Cents;
  note?: string;
}

export interface ImportMapping extends Base {
  bankName: string;
  dateColumn: string;
  dateFormat: string;
  amountColumn: string;
  descriptionColumn: string;
  invertSign: boolean;
}

// ---------- Estudos ----------
export interface Subject extends Base {
  name: string;
  semester: string;
  passingGrade: number;
  status: "cursando" | "aprovado" | "reprovado";
}

export interface Assessment extends Base {
  subjectId: ID;
  title: string;
  date: ISODate;
  weight?: number;
  grade?: number;
}

export interface Course extends Base {
  name: string;
  totalLessons: number;
  doneLessons: number;
  startedAt?: ISODate;
  finishedAt?: ISODate;
}

// ---------- Projetos ----------
export interface Project extends Base {
  name: string;
  status: "ativo" | "pausado" | "concluido";
  description?: string;
  nextStep?: string;
}

export interface FocusSession extends Base {
  pillar: "projetos" | "estudos";
  projectId?: ID;
  date: ISODate;
  minutes: number;
}

// ---------- Saúde ----------
export interface Workout extends Base {
  date: ISODate;
  type: "academia" | "jiujitsu";
  focus?: string;
  note?: string;
}

// ---------- Revisão ----------
export interface WeeklyReview extends Base {
  weekStart: ISODate;
  wentWell: string;
  gotStuck: string;
  nextWeekPriority: string;
  snapshot: Record<Pillar, number>;
}

// ---------- Configurações ----------
/* Uma linha só, com id fixo 'app'. */
export interface Settings {
  id: "app";
  startDate: ISODate;
  endDate: ISODate;
  theme: "claro" | "escuro" | "sistema";
  monthlySavingsBase: Cents;
  voipGoesToSavings: boolean;
  voipGoalId?: ID;
  lastBackupAt?: string;
  onboardedAt?: string;
  /* lembrete de treino por dia da semana (0 = domingo, 6 = sábado) */
  treinoLembrete: Record<number, string>;
  workAreas: string[];
}
