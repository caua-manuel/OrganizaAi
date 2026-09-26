/* Snapshot da semana para a Revisão: um número de 0 a 1 por pilar.
   HIPÓTESE (o briefing só diz "% das metas semanais atingidas"):
   - Saúde, Projetos, Estudos: média dos hábitos ativos do pilar.
   - Trabalho: 1 numa "boa semana" (acumulado diminuiu + entrega nova),
     0,5 se só uma das duas coisas aconteceu, 0 se nenhuma.
   - Finanças: quanto do limite semanal de "comer fora" foi respeitado
     (1 dentro do limite; limite/gasto acima dele). Sem limite, conta a
     meta de guardar do mês. */
import type { Cents, Habit, Pillar, Task } from "../db/types";
import type { Semana } from "./datas";
import { pctDoPilar } from "./habitos";
import type { DadosHabitos } from "./habitos";
import { balancoSemana } from "./trabalho";

export interface EntradaSnapshot {
  habitos: Habit[];
  dadosHabitos: DadosHabitos;
  tarefasTrabalho: Task[];
  comerFora?: { gasto: Cents; limite?: Cents };
  poupancaMes?: { guardado: Cents; meta: Cents };
}

const limitar = (x: number) => Math.max(0, Math.min(1, x));

export function snapshotSemana(semana: Semana, e: EntradaSnapshot): Record<Pillar, number> {
  const b = balancoSemana(e.tarefasTrabalho, semana);
  const trabalho = b.boa ? 1 : b.saiu > b.entrou || b.novasEntregues > 0 ? 0.5 : 0;

  let financas = 0;
  if (e.comerFora?.limite) financas = e.comerFora.gasto <= e.comerFora.limite ? 1 : e.comerFora.limite / e.comerFora.gasto;
  else if (e.poupancaMes?.meta) financas = e.poupancaMes.guardado / e.poupancaMes.meta;

  const pilar = (p: Pillar) => pctDoPilar(p, e.habitos, semana, e.dadosHabitos) ?? 0;
  return {
    financas: limitar(financas),
    trabalho,
    projetos: limitar(pilar("projetos")),
    estudos: limitar(pilar("estudos")),
    saude: limitar(pilar("saude")),
  };
}

/* Revisão fica "aberta" de sexta a domingo (0 = domingo, 5 = sexta). */
export const diaDeRevisao = (diaSemana: number) => diaSemana === 0 || diaSemana >= 5;
