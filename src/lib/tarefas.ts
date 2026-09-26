/* Tarefas: repetição e agrupamento por data. Funções puras
   (testadas em tarefas.test.ts). */
import type { ISODate, Repeticao, Task } from "../db/types";
import { diasEntre, somarDias, somarMeses } from "./datas";

export const avancar = (d: ISODate, r: Repeticao): ISODate =>
  r.unidade === "mes" ? somarMeses(d, r.cada) : somarDias(d, r.cada * (r.unidade === "semana" ? 7 : 1));

/* Datas da próxima ocorrência de uma tarefa repetida, concluída no dia
   `concluidaEm`. A base é o prazo (ou o dia planejado, ou o dia da
   conclusão). A base avança até passar do dia da conclusão — concluir
   atrasado não gera uma ocorrência já vencida. Prazo e dia planejado
   andam juntos, mantendo a distância entre eles. */
export function proximaOcorrencia(t: Pick<Task, "dueDate" | "plannedFor" | "repeat">, concluidaEm: ISODate) {
  if (!t.repeat || t.repeat.cada < 1) return null;
  const base = t.dueDate ?? t.plannedFor ?? concluidaEm;
  let nova = avancar(base, t.repeat);
  for (let i = 0; nova <= concluidaEm && i < 1000; i++) nova = avancar(nova, t.repeat);
  /* meses variam de tamanho: desloca pelo número real de dias */
  const delta = diasEntre(base, nova);
  if (!t.dueDate && !t.plannedFor) return { plannedFor: nova };
  return {
    dueDate: t.dueDate ? somarDias(t.dueDate, delta) : undefined,
    plannedFor: t.plannedFor ? somarDias(t.plannedFor, delta) : undefined,
  };
}

export function textoRepeticao(r?: Repeticao) {
  if (!r) return "";
  if (r.cada === 1) return { dia: "todo dia", semana: "toda semana", mes: "todo mês" }[r.unidade];
  return `a cada ${r.cada} ${{ dia: "dias", semana: "semanas", mes: "meses" }[r.unidade]}`;
}

export type Grupo = "atrasadas" | "hoje" | "proximos" | "depois" | "semData";

export const NOMES_GRUPO: Record<Grupo, string> = {
  atrasadas: "Atrasadas",
  hoje: "Hoje",
  proximos: "Próximos 7 dias",
  depois: "Depois",
  semData: "Sem data",
};

/* Agrupa tarefas ABERTAS. "Hoje" = planejada para hoje ou com prazo
   hoje. A data que manda é a mais cedo entre prazo e dia planejado. */
export function agruparTarefas(tarefas: Task[], hoje: ISODate): Record<Grupo, Task[]> {
  const g: Record<Grupo, Task[]> = { atrasadas: [], hoje: [], proximos: [], depois: [], semData: [] };
  const limite = somarDias(hoje, 7);
  for (const t of tarefas) {
    if (t.doneAt) continue;
    const datas = [t.dueDate, t.plannedFor].filter(Boolean) as ISODate[];
    if (!datas.length) g.semData.push(t);
    else if (t.plannedFor === hoje || t.dueDate === hoje) g.hoje.push(t);
    else {
      const ref = datas.sort()[0];
      g[ref < hoje ? "atrasadas" : ref <= limite ? "proximos" : "depois"].push(t);
    }
  }
  const porData = (a: Task, b: Task) =>
    (a.dueDate ?? a.plannedFor ?? "9999").localeCompare(b.dueDate ?? b.plannedFor ?? "9999") || a.createdAt.localeCompare(b.createdAt);
  for (const k of Object.keys(g) as Grupo[]) g[k].sort(porData);
  return g;
}
