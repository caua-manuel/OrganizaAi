import { describe, expect, it } from "vitest";
import { hojeISO, semanaAtual, ultimasSemanas, mesAnterior, limitesDoMes } from "./datas";

describe("semanaAtual", () => {
  it("começa na segunda e termina no domingo", () => {
    // 2026-09-26 é um sábado
    expect(semanaAtual("2026-09-26")).toEqual({ inicio: "2026-09-21", fim: "2026-09-27" });
  });
  it("domingo pertence à semana que começou na segunda anterior", () => {
    expect(semanaAtual("2026-09-27")).toEqual({ inicio: "2026-09-21", fim: "2026-09-27" });
  });
  it("segunda abre uma semana nova", () => {
    expect(semanaAtual("2026-09-28").inicio).toBe("2026-09-28");
  });
  it("atravessa a virada do ano", () => {
    expect(semanaAtual("2027-01-01")).toEqual({ inicio: "2026-12-28", fim: "2027-01-03" });
  });
});

describe("hojeISO", () => {
  it("usa o fuso de São Paulo", () => {
    // 01:30 UTC do dia 27 ainda é dia 26 em São Paulo (UTC-3)
    expect(hojeISO(new Date("2026-09-27T01:30:00Z"))).toBe("2026-09-26");
  });
});

describe("ultimasSemanas", () => {
  it("devolve da mais antiga para a atual", () => {
    const s = ultimasSemanas(3, "2026-09-26");
    expect(s.map((x) => x.inicio)).toEqual(["2026-09-07", "2026-09-14", "2026-09-21"]);
  });
});

describe("meses", () => {
  it("mesAnterior volta o ano quando precisa", () => {
    expect(mesAnterior("2026-01")).toBe("2025-12");
  });
  it("limitesDoMes conhece fevereiro", () => {
    expect(limitesDoMes("2028-02")).toEqual({ inicio: "2028-02-01", fim: "2028-02-29" });
  });
});
