import { describe, expect, it } from "vitest";
import type { Task } from "../db/types";
import { agruparTarefas, proximaOcorrencia, textoRepeticao } from "./tarefas";

describe("proximaOcorrencia", () => {
  it("sem repetição não gera nada", () => {
    expect(proximaOcorrencia({}, "2026-09-26")).toBeNull();
  });
  it("semanal avança o prazo 7 dias", () => {
    expect(proximaOcorrencia({ dueDate: "2026-09-25", repeat: { cada: 1, unidade: "semana" } }, "2026-09-24")).toEqual({
      dueDate: "2026-10-02",
      plannedFor: undefined,
    });
  });
  it("concluída com atraso não gera ocorrência já vencida", () => {
    // prazo 01/09, semanal, concluída 26/09 → próxima depois de 26/09: 29/09
    expect(proximaOcorrencia({ dueDate: "2026-09-01", repeat: { cada: 1, unidade: "semana" } }, "2026-09-26")?.dueDate).toBe("2026-09-29");
  });
  it("mensal no dia 31 respeita o fim do mês", () => {
    expect(proximaOcorrencia({ dueDate: "2027-01-31", repeat: { cada: 1, unidade: "mes" } }, "2027-01-31")?.dueDate).toBe("2027-02-28");
  });
  it("prazo e dia planejado andam juntos", () => {
    const r = proximaOcorrencia({ dueDate: "2026-09-30", plannedFor: "2026-09-28", repeat: { cada: 2, unidade: "semana" } }, "2026-09-28");
    expect(r).toEqual({ dueDate: "2026-10-14", plannedFor: "2026-10-12" });
  });
  it("sem datas, planeja a partir do dia da conclusão", () => {
    expect(proximaOcorrencia({ repeat: { cada: 3, unidade: "dia" } }, "2026-09-26")).toEqual({ plannedFor: "2026-09-29" });
  });
});

describe("textoRepeticao", () => {
  it("fala português", () => {
    expect(textoRepeticao({ cada: 1, unidade: "semana" })).toBe("toda semana");
    expect(textoRepeticao({ cada: 1, unidade: "mes" })).toBe("todo mês");
    expect(textoRepeticao({ cada: 2, unidade: "dia" })).toBe("a cada 2 dias");
  });
});

describe("agruparTarefas", () => {
  const t = (title: string, extra: Partial<Task> = {}): Task => ({
    id: title,
    title,
    pillar: null,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    ...extra,
  });
  it("separa por data e ignora as feitas", () => {
    const g = agruparTarefas(
      [
        t("atrasada", { plannedFor: "2026-09-20" }),
        t("hoje", { plannedFor: "2026-09-26" }),
        t("prazo hoje", { dueDate: "2026-09-26" }),
        t("semana", { dueDate: "2026-10-01" }),
        t("longe", { dueDate: "2026-11-01" }),
        t("solta"),
        t("feita", { doneAt: "2026-09-25T10:00:00Z" }),
      ],
      "2026-09-26",
    );
    expect(Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.map((x) => x.title)]))).toEqual({
      atrasadas: ["atrasada"],
      hoje: ["hoje", "prazo hoje"],
      proximos: ["semana"],
      depois: ["longe"],
      semData: ["solta"],
    });
  });
});
