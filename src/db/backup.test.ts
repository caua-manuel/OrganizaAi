import { describe, expect, it } from "vitest";
import { OrganizaDB } from "./db";
import { exportarTudo, importarTudo, validarBackup } from "./backup";
import { comBase } from "../lib/id";

describe("backup", () => {
  it("exportar e importar devolve exatamente os mesmos dados", async () => {
    const origem = new OrganizaDB("teste-origem");
    await origem.open();
    await origem.ideas.add(comBase({ text: "Ideia de teste", status: "inbox" as const }));
    const exportado = await exportarTudo(origem);

    const destino = new OrganizaDB("teste-destino");
    await destino.open();
    await destino.ideas.add(comBase({ text: "vai sumir", status: "inbox" as const }));
    await importarTudo(destino, JSON.parse(JSON.stringify(exportado)));

    const deNovo = await exportarTudo(destino);
    expect(deNovo.tabelas).toEqual(exportado.tabelas);
    expect((await destino.ideas.toArray()).map((i) => i.text)).toEqual(["Ideia de teste"]);
  });

  it("o banco novo já vem com categorias, hábitos e configurações", async () => {
    const banco = new OrganizaDB("teste-seed");
    await banco.open();
    expect(await banco.categories.count()).toBeGreaterThan(5);
    expect(await banco.habits.count()).toBeGreaterThan(0);
    expect((await banco.settings.get("app"))?.monthlySavingsBase).toBe(30000);
  });

  it("recusa arquivos que não são backup", async () => {
    const banco = new OrganizaDB("teste-valida");
    expect(validarBackup({ foo: 1 }, banco)).toMatch(/não é um backup/);
    expect(validarBackup({ app: "organizaai", versao: 1, tabelas: { hackers: [] } }, banco)).toMatch(/desconhecida/);
    expect(validarBackup({ app: "organizaai", versao: 99, tabelas: {} }, banco)).toMatch(/mais nova/);
  });
});
