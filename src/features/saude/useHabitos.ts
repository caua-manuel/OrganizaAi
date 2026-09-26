/* Lê os hábitos e tudo que alimenta o progresso deles (registros
   manuais, treinos e sessões de foco). Usado em Saúde, Hoje, Projetos,
   Estudos e Revisão. */
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import type { Habit } from "../../db/types";
import type { DadosHabitos } from "../../lib/habitos";

export function useHabitos(): { habitos: Habit[]; dados: DadosHabitos } | null {
  return (
    useLiveQuery(async () => {
      const [habitos, logs, workouts, focus] = await Promise.all([
        db.habits.toArray(),
        db.habitLogs.toArray(),
        db.workouts.orderBy("date").toArray(),
        db.focusSessions.toArray(),
      ]);
      habitos.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return { habitos, dados: { logs, workouts, focus } };
    }, []) ?? null
  );
}

export const textoHabito = (valor: number, meta: number, unidade: Habit["unit"]) =>
  unidade === "minutos" ? `${valor}/${meta} min` : `${valor}/${meta}`;
