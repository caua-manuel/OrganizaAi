/* Migrações do schema: abre um banco criado numa versão antiga e
   confere se, ao abrir com o app atual, os dados foram migrados. */
import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { ESQUEMA_V1, OrganizaDB } from "./db";
import { categorizar } from "../lib/financas";

const t = (ms: number) => new Date(Date.UTC(2026, 0, 1) + ms).toISOString();

describe("migração v1 → v2", () => {
  it("dá prioridade às regras antigas pela ordem em que foram criadas", async () => {
    const antigo = new Dexie("teste-migracao-v2");
    antigo.version(1).stores(ESQUEMA_V1);
    await antigo.open();
    await antigo.table("categoryRules").bulkAdd([
      { id: "b", contains: "UBER EATS", categoryId: "comer", createdAt: t(2), updatedAt: t(2) },
      { id: "a", contains: "UBER", categoryId: "transporte", createdAt: t(1), updatedAt: t(1) },
    ]);
    antigo.close();

    const novo = new OrganizaDB("teste-migracao-v2");
    await novo.open();
    const regras = await novo.categoryRules.toArray();
    expect(Object.fromEntries(regras.map((r) => [r.contains, r.priority]))).toEqual({ UBER: 1, "UBER EATS": 2 });
    /* o comportamento continua o mesmo de antes: a criada antes vale */
    expect(categorizar("UBER EATS pedido", regras)?.categoryId).toBe("transporte");
    novo.close();
  });
});
