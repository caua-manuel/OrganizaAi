import { describe, expect, it } from "vitest";
import type { Habit, Workout } from "../db/types";
import { pctDoPilar, progressoHabito, semanasSeguidas, sugestoesDeMeta } from "./habitos";
import type { DadosHabitos } from "./habitos";

const base = { createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };
const academia: Habit = { ...base, id: "a", pillar: "saude", title: "Academia", weeklyTarget: 3, unit: "vezes", active: true, link: "treino:academia" };
const jiu: Habit = { ...base, id: "j", pillar: "saude", title: "Jiu-jitsu", weeklyTarget: 1, unit: "vezes", active: true, link: "treino:jiujitsu" };
const foco: Habit = { ...base, id: "f", pillar: "projetos", title: "Foco", weeklyTarget: 240, unit: "minutos", active: true, link: "foco:projetos" };
let n = 0;
const treino = (date: string, type: Workout["type"]): Workout => ({ ...base, id: `w${n++}`, date, type });
const vazio: DadosHabitos = { logs: [], workouts: [], focus: [] };
const semana = { inicio: "2026-09-21", fim: "2026-09-27" };

/* semana cumprida: 3 academias + 1 jiu a partir da segunda dada */
const semanaCheia = (seg: string): Workout[] => {
  const d = (k: number) => `2026-${seg.slice(5, 7)}-${String(Number(seg.slice(8)) + k).padStart(2, "0")}`;
  return [treino(d(0), "academia"), treino(d(1), "academia"), treino(d(2), "academia"), treino(d(3), "jiujitsu")];
};

describe("progressoHabito", () => {
  it("um treino de academia conta para o hábito Academia", () => {
    const d = { ...vazio, workouts: [treino("2026-09-22", "academia"), treino("2026-09-23", "jiujitsu")] };
    expect(progressoHabito(academia, semana, d)).toMatchObject({ valor: 1, meta: 3, bateu: false });
  });
  it("mostra o valor real acima da meta, mas o pct para em 100%", () => {
    const d = { ...vazio, workouts: [1, 2, 3, 4, 5].map((i) => treino(`2026-09-2${i}`, "academia")) };
    expect(progressoHabito(academia, semana, d)).toMatchObject({ valor: 5, pct: 1, bateu: true });
  });
  it("sessões de foco somam minutos e registros manuais também contam", () => {
    const d: DadosHabitos = {
      workouts: [],
      focus: [{ ...base, id: "s", pillar: "projetos", date: "2026-09-22", minutes: 60 }],
      logs: [{ ...base, id: "l", habitId: "f", date: "2026-09-24", amount: 30 }],
    };
    expect(progressoHabito(foco, semana, d).valor).toBe(90);
  });
});

describe("semanasSeguidas", () => {
  it("conta semanas cumpridas de trás para frente; a atual em andamento não quebra", () => {
    const d = { ...vazio, workouts: [...semanaCheia("2026-09-07"), ...semanaCheia("2026-09-14")] };
    expect(semanasSeguidas([academia, jiu], d, "2026-09-23")).toBe(2);
  });
  it("uma semana falhada zera a contagem", () => {
    const d = { ...vazio, workouts: [...semanaCheia("2026-09-07")] };
    expect(semanasSeguidas([academia, jiu], d, "2026-09-23")).toBe(0);
  });
});

describe("sugestoesDeMeta", () => {
  it("depois de 3 semanas cumpridas sugere subir um passo", () => {
    const d = { ...vazio, workouts: ["2026-08-31", "2026-09-07", "2026-09-14"].flatMap(semanaCheia) };
    const s = sugestoesDeMeta([academia, jiu], d, "2026-09-23");
    expect(s.map((x) => [x.habito.title, x.novaMeta])).toEqual([
      ["Academia", 4],
      ["Jiu-jitsu", 2],
    ]);
  });
  it("não sugere passar do objetivo", () => {
    const d = { ...vazio, workouts: ["2026-08-31", "2026-09-07", "2026-09-14"].flatMap(semanaCheia) };
    const s = sugestoesDeMeta([{ ...academia, weeklyTarget: 3 }, { ...jiu, weeklyTarget: 2 }], d, "2026-09-23");
    expect(s).toEqual([]);
  });
});

describe("pctDoPilar", () => {
  it("é a média das metas do pilar", () => {
    const d = { ...vazio, workouts: [treino("2026-09-22", "jiujitsu")] };
    expect(pctDoPilar("saude", [academia, jiu], semana, d)).toBeCloseTo(0.5);
    expect(pctDoPilar("estudos", [academia], semana, d)).toBeNull();
  });
});
