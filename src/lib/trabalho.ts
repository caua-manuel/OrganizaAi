/* Trabalho: acumulado × novo. O indicador principal é o balanço do
   acumulado na semana: quanto entrou, quanto saiu (resolvido) e o
   tamanho no fim da semana. "Boa semana" = o acumulado diminuiu E
   houve entregas novas. */
import type { ISODate, Task } from "../db/types";
import { dentro, hojeISO } from "./datas";
import type { Semana } from "./datas";

/* createdAt/doneAt são instantes (ISO com hora); o dia é o de São Paulo */
export const diaDe = (instante: string): ISODate => hojeISO(new Date(instante));

export function balancoSemana(tasks: Task[], semana: Semana) {
  const acumulado = tasks.filter((t) => t.kind === "acumulado");
  const entrou = acumulado.filter((t) => dentro(diaDe(t.createdAt), semana)).length;
  const saiu = acumulado.filter((t) => t.doneAt && dentro(diaDe(t.doneAt), semana)).length;
  const novasEntregues = tasks.filter((t) => t.kind === "novo" && t.doneAt && dentro(diaDe(t.doneAt), semana)).length;
  return { entrou, saiu, novasEntregues, tamanhoFim: tamanhoEm(acumulado, semana.fim), boa: saiu > entrou && novasEntregues > 0 };
}

/* Tamanho do acumulado no fim do dia `dia`: criadas até lá e ainda
   não resolvidas naquele dia. */
export function tamanhoEm(acumulado: Task[], dia: ISODate) {
  return acumulado.filter((t) => t.kind === "acumulado" && diaDe(t.createdAt) <= dia && (!t.doneAt || diaDe(t.doneAt) > dia)).length;
}
