import { describe, expect, it } from "vitest";
import { formatarReais, lerReais } from "./dinheiro";

describe("formatarReais", () => {
  it("formata centavos no padrão brasileiro", () => {
    expect(formatarReais(123456)).toBe("R$ 1.234,56");
    expect(formatarReais(5)).toBe("R$ 0,05");
    expect(formatarReais(0)).toBe("R$ 0,00");
  });
  it("mostra o sinal de saída", () => {
    expect(formatarReais(-4590)).toBe("-R$ 45,90");
  });
});

describe("lerReais", () => {
  it.each([
    ["45,90", 4590],
    ["45.90", 4590],
    ["1.234,56", 123456],
    ["1.234", 123400],
    ["R$ 12", 1200],
    ["0,1", 10],
    ["-3,5", -350],
  ])("'%s' vira %i centavos", (texto, esperado) => {
    expect(lerReais(texto)).toBe(esperado);
  });
  it("recusa o que não é número", () => {
    expect(lerReais("")).toBeNull();
    expect(lerReais("abc")).toBeNull();
    expect(lerReais("1,2,3")).toBeNull();
  });
  it("não erra centavos de ponto flutuante", () => {
    expect(lerReais("0,29")).toBe(29);
    expect(lerReais("19,99")).toBe(1999);
  });
});
