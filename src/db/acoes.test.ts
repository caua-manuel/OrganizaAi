import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import {
  alternarTarefa,
  apagarCategoria,
  categoriaPorNome,
  criarIdeia,
  criarLancamento,
  criarRegra,
  criarTarefa,
  ideiaParaTarefa,
  moverRegra,
  sugestoesParaHoje,
} from "./acoes";
import { ordenarRegras } from "../lib/financas";
import { hojeISO, somarDias } from "../lib/datas";

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe("tarefas do dia", () => {
  it("aceita até 5 tarefas para hoje; a sexta fica sem dia", async () => {
    const hoje = hojeISO();
    for (let i = 0; i < 5; i++) {
      const r = await criarTarefa({ title: `t${i}`, plannedFor: hoje });
      expect(r.cabeHoje).toBe(true);
    }
    const sexta = await criarTarefa({ title: "t6", plannedFor: hoje });
    expect(sexta.cabeHoje).toBe(false);
    expect(sexta.tarefa.plannedFor).toBeUndefined();
  });

  it("desfazer apaga a tarefa criada", async () => {
    const { desfazer, tarefa } = await criarTarefa({ title: "x" });
    await desfazer();
    expect(await db.tasks.get(tarefa.id)).toBeUndefined();
  });

  it("sugere atrasadas e com prazo próximo, não as já feitas", async () => {
    const hoje = hojeISO();
    await criarTarefa({ title: "atrasada", plannedFor: somarDias(hoje, -2) });
    await criarTarefa({ title: "prazo", dueDate: somarDias(hoje, 2) });
    await criarTarefa({ title: "longe", dueDate: somarDias(hoje, 20) });
    const feita = await criarTarefa({ title: "feita", plannedFor: somarDias(hoje, -1) });
    await db.tasks.update(feita.tarefa.id, { doneAt: new Date().toISOString() });
    const s = await sugestoesParaHoje();
    expect(s.map((x) => x.tarefa.title).sort()).toEqual(["atrasada", "prazo"]);
  });
});

describe("ideias", () => {
  it("ideia que vira tarefa aponta para a tarefa de origem", async () => {
    await criarIdeia("Ideia boa");
    const ideia = (await db.ideas.toArray())[0];
    await ideiaParaTarefa(ideia.id);
    const depois = await db.ideas.get(ideia.id);
    expect(depois?.status).toBe("movida");
    const tarefa = await db.tasks.get(depois!.movedTo!.id);
    expect(tarefa?.title).toBe("Ideia boa");
  });
});

describe("Fase 6", () => {
  it("concluir tarefa que se repete cria a próxima; desmarcar não cria outra", async () => {
    const { tarefa } = await criarTarefa({ title: "Pagar internet", dueDate: "2026-09-10", repeat: { cada: 1, unidade: "mes" } });
    const { proxima } = await alternarTarefa(tarefa.id);
    // mensal: mesmo dia do mês, e já no futuro (não gera uma vencida)
    expect(proxima?.dueDate?.slice(8)).toBe("10");
    expect(proxima!.dueDate! > hojeISO()).toBe(true);
    expect(proxima?.repeat).toEqual({ cada: 1, unidade: "mes" });
    expect(proxima?.doneAt).toBeUndefined();
    await alternarTarefa(tarefa.id); // desmarca
    expect(await db.tasks.count()).toBe(2);
  });

  it("apagar categoria move os lançamentos e apaga as regras dela", async () => {
    const semCat = await categoriaPorNome("Sem categoria", "saida");
    const lazer = await categoriaPorNome("Lazer", "saida");
    await criarLancamento({ date: "2026-09-01", amount: -1000, description: "CINEMA", categoryId: lazer });
    await criarRegra("CINEMA", lazer);
    expect(await apagarCategoria(lazer)).toBe(1);
    expect((await db.transactions.toArray())[0].categoryId).toBe(semCat);
    expect(await db.categoryRules.where("categoryId").equals(lazer).count()).toBe(0);
    expect(await apagarCategoria(semCat)).toBe(0);
    expect(await db.categories.get(semCat)).toBeDefined();
  });

  it("mover regra troca a prioridade", async () => {
    const c = await categoriaPorNome("Transporte", "saida");
    await criarRegra("UBER", c);
    await criarRegra("99APP", c);
    const [a, b] = ordenarRegras(await db.categoryRules.toArray());
    expect([a.contains, b.contains]).toEqual(["UBER", "99APP"]);
    await moverRegra(b.id, -1);
    expect(ordenarRegras(await db.categoryRules.toArray()).map((r) => r.contains)).toEqual(["99APP", "UBER"]);
  });
});
