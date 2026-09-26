import { describe, expect, it } from "vitest";
import type { Task } from "../db/types";
import { balancoSemana, tamanhoEm } from "./trabalho";

let n = 0;
/* horários em UTC; 15:00Z = meio-dia em São Paulo */
const t = (kind: Task["kind"], criada: string, feita?: string): Task => ({
  id: `t${n++}`,
  createdAt: `${criada}T15:00:00Z`,
  updatedAt: `${criada}T15:00:00Z`,
  title: "x",
  pillar: "trabalho",
  kind,
  doneAt: feita ? `${feita}T15:00:00Z` : undefined,
});
const semana = { inicio: "2026-09-21", fim: "2026-09-27" };

describe("balancoSemana", () => {
  it("conta o que entrou e saiu do acumulado e as entregas novas", () => {
    const tasks = [
      t("acumulado", "2026-09-01", "2026-09-22"), // saiu
      t("acumulado", "2026-09-02", "2026-09-23"), // saiu
      t("acumulado", "2026-09-22"), // entrou, continua aberta
      t("acumulado", "2026-09-03"), // velha, aberta
      t("novo", "2026-09-21", "2026-09-24"), // entrega nova
    ];
    expect(balancoSemana(tasks, semana)).toEqual({ entrou: 1, saiu: 2, novasEntregues: 1, tamanhoFim: 2, boa: true });
  });

  it("sem entrega nova não é boa semana, mesmo diminuindo o acumulado", () => {
    const tasks = [t("acumulado", "2026-09-01", "2026-09-22")];
    expect(balancoSemana(tasks, semana).boa).toBe(false);
  });

  it("uma tarefa concluída de madrugada conta no dia de São Paulo", () => {
    // 02:00Z do dia 28 = 23:00 do dia 27 em São Paulo (ainda domingo)
    const tarefa: Task = { ...t("acumulado", "2026-09-01"), doneAt: "2026-09-28T02:00:00Z" };
    expect(balancoSemana([tarefa], semana).saiu).toBe(1);
  });
});

describe("tamanhoEm", () => {
  it("considera só as criadas até o dia e ainda abertas nele", () => {
    const tasks = [t("acumulado", "2026-09-01", "2026-09-10"), t("acumulado", "2026-09-05"), t("acumulado", "2026-09-20")];
    expect(tamanhoEm(tasks, "2026-09-07")).toBe(2);
    expect(tamanhoEm(tasks, "2026-09-15")).toBe(1);
  });
});
