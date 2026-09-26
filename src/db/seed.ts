/* Dados que o app já traz no primeiro uso. Tudo aqui pode ser
   editado nas Configurações; são só pontos de partida razoáveis.

   HIPÓTESE: as categorias e os valores padrão foram escolhidos por
   nós, não vieram do briefing (exceto "Comer fora" e as origens). */
import type { Transaction as DexieTx } from "dexie";
import type { Category, CategoryRule, Habit, SavingsGoal, Settings } from "./types";
import { comBase } from "../lib/id";
import { hojeISO, somarMeses } from "../lib/datas";

type SemBase<T> = Omit<T, "id" | "createdAt" | "updatedAt">;

export const CATEGORIAS_PADRAO: SemBase<Category>[] = [
  { name: "Comer fora", type: "saida", color: "#E4572E", weeklyLimit: 15000 },
  { name: "Mercado", type: "saida", color: "#12A150" },
  { name: "Transporte", type: "saida", color: "#2F6FEB" },
  { name: "Moradia", type: "saida", color: "#6B7385" },
  { name: "Assinaturas", type: "saida", color: "#7B5CF0" },
  { name: "Lazer", type: "saida", color: "#C8378A" },
  { name: "Saúde", type: "saida", color: "#E39A0B" },
  { name: "Educação", type: "saida", color: "#0E9AA7" },
  { name: "Outros gastos", type: "saida", color: "#9AA2B1" },
  { name: "Sem categoria", type: "saida", color: "#B8BEC9" },
  { name: "Salário", type: "entrada", color: "#12A150" },
  { name: "VoIP", type: "entrada", color: "#2F6FEB" },
  { name: "Freela", type: "entrada", color: "#C8378A" },
  { name: "Sistema", type: "entrada", color: "#7B5CF0" },
  { name: "Outras entradas", type: "entrada", color: "#9AA2B1" },
];

/* palavra no extrato → nome da categoria */
const REGRAS_PADRAO: [string, string][] = [
  ["IFOOD", "Comer fora"],
  ["RAPPI", "Comer fora"],
  ["UBER", "Transporte"],
  ["99APP", "Transporte"],
  ["NETFLIX", "Assinaturas"],
  ["SPOTIFY", "Assinaturas"],
  ["FARMACIA", "Saúde"],
  ["DROGA", "Saúde"],
];

export const HABITOS_PADRAO: SemBase<Habit>[] = [
  { pillar: "saude", title: "Academia", weeklyTarget: 3, unit: "vezes", active: true, link: "treino:academia" },
  { pillar: "saude", title: "Jiu-jitsu", weeklyTarget: 1, unit: "vezes", active: true, link: "treino:jiujitsu" },
  { pillar: "saude", title: "Refeições feitas em casa", weeklyTarget: 5, unit: "vezes", active: false },
  { pillar: "projetos", title: "Foco em projeto", weeklyTarget: 240, unit: "minutos", active: true, link: "foco:projetos" },
  { pillar: "estudos", title: "Estudo fora da aula", weeklyTarget: 180, unit: "minutos", active: true, link: "foco:estudos" },
];

export function settingsPadrao(): Settings {
  const hoje = hojeISO();
  return {
    id: "app",
    startDate: hoje,
    endDate: somarMeses(hoje, 6),
    theme: "sistema",
    monthlySavingsBase: 30000,
    voipGoesToSavings: true,
    /* seg, ter, sex: 15h; qua, qui: almoço */
    treinoLembrete: { 1: "Treino às 15h", 2: "Treino às 15h", 3: "Treino no almoço", 4: "Treino no almoço", 5: "Treino às 15h" },
    workAreas: ["design", "social media", "suporte", "telefonia", "URA"],
  };
}

export async function popular(tx: DexieTx) {
  const categorias = CATEGORIAS_PADRAO.map((c) => comBase(c));
  await tx.table("categories").bulkAdd(categorias);

  const porNome = new Map(categorias.map((c) => [c.name, c.id]));
  const regras: CategoryRule[] = REGRAS_PADRAO.map(([contains, nome]) =>
    comBase({ contains, categoryId: porNome.get(nome)! }),
  );
  await tx.table("categoryRules").bulkAdd(regras);

  await tx.table("habits").bulkAdd(HABITOS_PADRAO.map((h) => comBase(h)));

  const viagem: SavingsGoal = comBase({ name: "Viagem", targetAmount: 0 });
  const reserva: SavingsGoal = comBase({ name: "Reserva de emergência", targetAmount: 0, autoTarget: { monthsOfExpenses: 3 } });
  await tx.table("savingsGoals").bulkAdd([viagem, reserva]);

  await tx.table("settings").add({ ...settingsPadrao(), voipGoalId: viagem.id });
}
