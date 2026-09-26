import { describe, expect, it } from "vitest";
import type { CategoryRule, SavingsDeposit, SavingsGoal, Transaction } from "../db/types";
import {
  alvoDaMeta,
  categorizar,
  gastoMedioMensal,
  gastoNaSemana,
  guardadoNoMes,
  importHash,
  metaMensalPoupanca,
  palavraChave,
  projecaoMeta,
  resumoMes,
} from "./financas";

const base = { createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };
let n = 0;
const tx = (date: string, amount: number, extra: Partial<Transaction> = {}): Transaction => ({
  ...base,
  id: `t${n++}`,
  date,
  amount,
  description: "x",
  categoryId: "c",
  origin: "manual",
  ...extra,
});
const dep = (date: string, amount: number, goalId = "viagem"): SavingsDeposit => ({ ...base, id: `d${n++}`, goalId, date, amount });

describe("metaMensalPoupanca", () => {
  it("é a base mais tudo que entrou de VoIP no mês", () => {
    const txs = [
      tx("2026-09-03", 12000, { source: "voip" }),
      tx("2026-09-20", 8000, { source: "voip" }),
      tx("2026-09-05", 300000, { source: "salario_1" }),
      tx("2026-08-30", 5000, { source: "voip" }), // outro mês
    ];
    expect(metaMensalPoupanca("2026-09", { monthlySavingsBase: 30000 }, txs)).toBe(50000);
  });
});

describe("resumoMes", () => {
  it("separa entradas, saídas e sobra", () => {
    const r = resumoMes("2026-09", [tx("2026-09-01", 100000, { source: "freela" }), tx("2026-09-02", -4590), tx("2026-10-01", -100)]);
    expect(r).toMatchObject({ entradas: 100000, saidas: 4590, sobra: 95410 });
    expect(r.porOrigem.get("freela")).toBe(100000);
  });
});

describe("guardadoNoMes", () => {
  it("soma aportes e desconta retiradas", () => {
    expect(guardadoNoMes("2026-09", [dep("2026-09-01", 20000), dep("2026-09-10", -5000), dep("2026-08-10", 999)])).toBe(15000);
  });
});

describe("gastoMedioMensal", () => {
  it("usa os 3 meses fechados anteriores", () => {
    const txs = [tx("2026-06-10", -100000), tx("2026-07-10", -200000), tx("2026-08-10", -300000), tx("2026-09-10", -999999)];
    expect(gastoMedioMensal(txs, "2026-09-26")).toBe(200000);
  });
  it("sem 3 meses de dados, não calcula", () => {
    expect(gastoMedioMensal([tx("2026-08-10", -300000)], "2026-09-26")).toBeNull();
  });
});

describe("alvoDaMeta", () => {
  const reserva: SavingsGoal = { ...base, id: "r", name: "Reserva", targetAmount: 500000, autoTarget: { monthsOfExpenses: 3 } };
  it("reserva automática = N × gasto médio", () => {
    expect(alvoDaMeta(reserva, 200000)).toEqual({ alvo: 600000, automatico: true });
  });
  it("sem gasto médio, usa o valor manual", () => {
    expect(alvoDaMeta(reserva, null)).toEqual({ alvo: 500000, automatico: false });
  });
});

describe("projecaoMeta", () => {
  it("sem aportes → sem projeção ainda", () => {
    expect(projecaoMeta("viagem", 500000, [], "2026-09-26")).toEqual({ tipo: "sem-dados" });
  });
  it("estima pela média dos últimos 3 meses", () => {
    const deps = [dep("2026-07-05", 30000), dep("2026-08-05", 30000), dep("2026-09-05", 30000)];
    // saldo 90.000, falta 210.000, média 30.000/mês → 7 meses
    const p = projecaoMeta("viagem", 300000, deps, "2026-09-26");
    expect(p).toEqual({ tipo: "estimada", mediaMensal: 30000, meses: 7, data: "2027-04-26" });
  });
  it("com só 1 mês de aportes, usa só esse mês", () => {
    const p = projecaoMeta("viagem", 100000, [dep("2026-09-05", 50000)], "2026-09-26");
    expect(p).toMatchObject({ tipo: "estimada", mediaMensal: 50000, meses: 1 });
  });
  it("meta batida", () => {
    expect(projecaoMeta("viagem", 1000, [dep("2026-09-05", 5000)], "2026-09-26")).toEqual({ tipo: "atingida" });
  });
});

describe("gastoNaSemana", () => {
  it("soma só a categoria dentro da semana", () => {
    const txs = [tx("2026-09-21", -2000, { categoryId: "comer" }), tx("2026-09-27", -3000, { categoryId: "comer" }), tx("2026-09-28", -9000, { categoryId: "comer" }), tx("2026-09-22", -500)];
    expect(gastoNaSemana("comer", { inicio: "2026-09-21", fim: "2026-09-27" }, txs)).toBe(5000);
  });
});

describe("importHash", () => {
  it("ignora maiúsculas e espaços repetidos na descrição", () => {
    expect(importHash("2026-09-01", -4590, "iFood  *Loja")).toBe(importHash("2026-09-01", -4590, "IFOOD *LOJA "));
  });
  it("muda se data ou valor mudarem", () => {
    const h = importHash("2026-09-01", -4590, "IFOOD");
    expect(importHash("2026-09-02", -4590, "IFOOD")).not.toBe(h);
    expect(importHash("2026-09-01", -4591, "IFOOD")).not.toBe(h);
  });
});

describe("categorizar", () => {
  const regra = (contains: string, categoryId: string, createdAt: string): CategoryRule => ({ ...base, id: contains, contains, categoryId, createdAt });
  const regras = [regra("UBER EATS", "comer", "2026-01-02"), regra("uber", "transporte", "2026-01-01")];
  it("usa a primeira regra criada que bate, sem diferenciar maiúsculas", () => {
    expect(categorizar("Uber *trip", regras)?.categoryId).toBe("transporte");
    expect(categorizar("UBER EATS pedido", regras)?.categoryId).toBe("transporte");
  });
  it("sem regra → null", () => {
    expect(categorizar("PADARIA", regras)).toBeNull();
  });
});

describe("palavraChave", () => {
  it("pega a primeira palavra útil", () => {
    expect(palavraChave("IFOOD *RESTAURANTE X")).toBe("IFOOD");
    expect(palavraChave("Compra no débito - PADARIA DO ZÉ")).toBe("PADARIA");
  });
});
