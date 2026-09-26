import { describe, expect, it } from "vitest";
import type { Assessment, Subject } from "../db/types";
import { mediaMateria, proximasAvaliacoes, situacaoMateria } from "./estudos";

const base = { createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };
let n = 0;
const av = (date: string, grade?: number, weight?: number, subjectId = "m"): Assessment => ({ ...base, id: `a${n++}`, subjectId, title: "P", date, grade, weight });
const materia: Subject = { ...base, id: "m", name: "Cálculo", semester: "2026.2", passingGrade: 6, status: "cursando" };

describe("mediaMateria", () => {
  it("é ponderada e ignora avaliações sem nota", () => {
    // (5×1 + 8×2) / 3 = 7
    expect(mediaMateria("m", [av("2026-09-01", 5, 1), av("2026-09-10", 8, 2), av("2026-10-01")])).toBeCloseTo(7);
  });
  it("sem peso vale 1; sem notas é null", () => {
    expect(mediaMateria("m", [av("2026-09-01", 4), av("2026-09-02", 6)])).toBeCloseTo(5);
    expect(mediaMateria("m", [av("2026-10-01")])).toBeNull();
  });
});

describe("situacaoMateria", () => {
  it("compara com a média para passar", () => {
    expect(situacaoMateria(materia, 7)).toEqual({ texto: "Acima da média", ok: true });
    expect(situacaoMateria(materia, 5.5)).toEqual({ texto: "Faltam 0,5 para a média", ok: false });
    expect(situacaoMateria(materia, null).ok).toBeNull();
  });
});

describe("proximasAvaliacoes", () => {
  it("ordena por data e marca as dos próximos 7 dias", () => {
    const r = proximasAvaliacoes([av("2026-10-20"), av("2026-09-30"), av("2026-09-20"), av("2026-09-28", 9)], "2026-09-26");
    expect(r.map((x) => [x.avaliacao.date, x.emBreve])).toEqual([
      ["2026-09-30", true],
      ["2026-10-20", false],
    ]);
  });
});
