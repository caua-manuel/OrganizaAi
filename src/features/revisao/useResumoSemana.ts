/* Junta tudo que a Revisão precisa mostrar de uma semana: o snapshot
   por pilar e os números por trás dele. */
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { useSettings } from "../../db/hooks";
import { dentro, mesDe } from "../../lib/datas";
import type { Semana } from "../../lib/datas";
import { gastoNaSemana, guardadoNoMes, metaMensalPoupanca } from "../../lib/financas";
import { progressoHabito } from "../../lib/habitos";
import { snapshotSemana } from "../../lib/revisao";
import { balancoSemana } from "../../lib/trabalho";

export function useResumoSemana(semana: Semana) {
  const settings = useSettings();
  return useLiveQuery(async () => {
    const [habitos, logs, workouts, focus, tarefasTrabalho, comer, txs, deps, avaliacoes, materias] = await Promise.all([
      db.habits.toArray(),
      db.habitLogs.toArray(),
      db.workouts.toArray(),
      db.focusSessions.toArray(),
      db.tasks.where("pillar").equals("trabalho").toArray(),
      db.categories.where("name").equals("Comer fora").first(),
      db.transactions.toArray(),
      db.savingsDeposits.toArray(),
      db.assessments.toArray(),
      db.subjects.toArray(),
    ]);
    const dadosHabitos = { logs, workouts, focus };
    const mes = mesDe(semana.fim);
    const comerFora = comer ? { gasto: gastoNaSemana(comer.id, semana, txs), limite: comer.weeklyLimit } : undefined;
    const poupancaMes = { guardado: guardadoNoMes(mes, deps), meta: metaMensalPoupanca(mes, settings, txs) };
    const ativos = habitos.filter((h) => h.active).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const nomeMateria = new Map(materias.map((m) => [m.id, m.name]));
    return {
      snapshot: snapshotSemana(semana, { habitos, dadosHabitos, tarefasTrabalho, comerFora, poupancaMes }),
      comerFora,
      poupancaMes,
      guardadoSemana: deps.filter((d) => dentro(d.date, semana)).reduce((s, d) => s + d.amount, 0),
      trabalho: balancoSemana(tarefasTrabalho, semana),
      habitos: ativos.map((h) => ({ habito: h, ...progressoHabito(h, semana, dadosHabitos) })),
      avaliacoes: avaliacoes
        .filter((a) => dentro(a.date, semana))
        .map((a) => ({ ...a, materia: nomeMateria.get(a.subjectId) ?? "" })),
    };
  }, [semana.inicio, settings.monthlySavingsBase]);
}
