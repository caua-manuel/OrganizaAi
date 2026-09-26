/* Carrega de uma vez tudo que as telas de finanças precisam. Para uso
   pessoal (alguns milhares de lançamentos) ler tudo é rápido e deixa
   os cálculos simples. */
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { useSettings } from "../../db/hooks";
import { hojeISO, mesDe } from "../../lib/datas";
import {
  alvoDaMeta,
  gastoMedioMensal,
  guardadoNoMes,
  metaMensalPoupanca,
  projecaoMeta,
  saldoMeta,
} from "../../lib/financas";

export function useFinancas() {
  const settings = useSettings();
  const dados = useLiveQuery(async () => {
    const [txs, deps, metas, cats, regras] = await Promise.all([
      db.transactions.orderBy("date").reverse().toArray(),
      db.savingsDeposits.toArray(),
      db.savingsGoals.toArray().then((ms) => ms.sort((a, b) => a.createdAt.localeCompare(b.createdAt))),
      db.categories.toArray(),
      db.categoryRules.toArray(),
    ]);
    return { txs, deps, metas, cats, regras };
  }, []);

  if (!dados) return null;
  const hoje = hojeISO();
  const mes = mesDe(hoje);
  const gastoMedio = gastoMedioMensal(dados.txs, hoje);

  const metas = dados.metas.map((meta) => {
    const { alvo, automatico } = alvoDaMeta(meta, gastoMedio);
    const saldo = saldoMeta(meta.id, dados.deps);
    return { meta, alvo, automatico, saldo, projecao: projecaoMeta(meta.id, alvo, dados.deps, hoje) };
  });

  return {
    ...dados,
    settings,
    hoje,
    mes,
    gastoMedio,
    metas,
    metaDoMes: metaMensalPoupanca(mes, settings, dados.txs),
    guardadoMes: guardadoNoMes(mes, dados.deps),
    catPorId: new Map(dados.cats.map((c) => [c.id, c])),
  };
}

export type DadosFinancas = NonNullable<ReturnType<typeof useFinancas>>;
