import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { criarIdeia, criarTarefa, ideiaParaTarefa, sugestoesParaHoje } from "./acoes";
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
