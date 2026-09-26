import { describe, expect, it } from "vitest";
import type { Habit } from "../db/types";
import { diaDeRevisao, snapshotSemana } from "./revisao";

const base = { createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };
const academia: Habit = { ...base, id: "a", pillar: "saude", title: "Academia", weeklyTarget: 2, unit: "vezes", active: true, link: "treino:academia" };
const semana = { inicio: "2026-09-21", fim: "2026-09-27" };
const vazio = { logs: [], workouts: [], focus: [] };

describe("snapshotSemana", () => {
  it("dá 0 a 1 por pilar", () => {
    const s = snapshotSemana(semana, {
      habitos: [academia],
      dadosHabitos: { ...vazio, workouts: [{ ...base, id: "w", date: "2026-09-22", type: "academia" }] },
      tarefasTrabalho: [],
      comerFora: { gasto: 20000, limite: 15000 },
    });
    expect(s).toEqual({ financas: 0.75, trabalho: 0, projetos: 0, estudos: 0, saude: 0.5 });
  });

  it("dentro do limite de comer fora = 100% em finanças", () => {
    const s = snapshotSemana(semana, { habitos: [], dadosHabitos: vazio, tarefasTrabalho: [], comerFora: { gasto: 5000, limite: 15000 } });
    expect(s.financas).toBe(1);
  });

  it("sem limite, usa a meta de guardar do mês", () => {
    const s = snapshotSemana(semana, { habitos: [], dadosHabitos: vazio, tarefasTrabalho: [], poupancaMes: { guardado: 15000, meta: 30000 } });
    expect(s.financas).toBe(0.5);
  });
});

describe("diaDeRevisao", () => {
  it("de sexta a domingo", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(diaDeRevisao)).toEqual([true, false, false, false, false, true, true]);
  });
});
