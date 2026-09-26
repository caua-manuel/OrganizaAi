/* "Semana em andamento" na Hoje: um mini-indicador por pilar. */
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { semanaAtual } from "../../lib/datas";
import { reais } from "../../lib/dinheiro";
import { gastoNaSemana } from "../../lib/financas";
import { progressoHabito } from "../../lib/habitos";
import { balancoSemana } from "../../lib/trabalho";
import { Indicador, Painel, corPilar } from "../../ui/ui";
import { textoHabito, useHabitos } from "../saude/useHabitos";

export function SemanaAndamento() {
  const h = useHabitos();
  const semana = semanaAtual();
  const extra = useLiveQuery(async () => {
    const comer = await db.categories.where("name").equals("Comer fora").first();
    const txs = comer ? await db.transactions.where("categoryId").equals(comer.id).toArray() : [];
    const tarefas = await db.tasks.where("pillar").equals("trabalho").toArray();
    return { comer, gasto: comer ? gastoNaSemana(comer.id, semana, txs) : 0, trabalho: balancoSemana(tarefas, semana) };
  }, [semana.inicio]);
  if (!h || !extra) return null;

  const ativos = h.habitos.filter((x) => x.active);
  const { trabalho } = extra;
  return (
    <Painel titulo="Semana em andamento">
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {ativos.map((habito) => {
          const p = progressoHabito(habito, semana, h.dados);
          return (
            <Indicador
              key={habito.id}
              nome={habito.title}
              texto={textoHabito(p.valor, p.meta, habito.unit)}
              valor={p.valor}
              meta={p.meta}
              cor={corPilar(habito.pillar)}
            />
          );
        })}
        {extra.comer?.weeklyLimit ? (
          <Indicador
            nome="Comer fora"
            texto={`${reais(extra.gasto)} de ${reais(extra.comer.weeklyLimit)}`}
            valor={extra.gasto}
            meta={extra.comer.weeklyLimit}
            cor={corPilar("financas")}
          />
        ) : null}
        <div className="text-sm">
          <div className="mb-1 flex justify-between gap-2">
            <span>Acumulado do trabalho</span>
            <span className="num text-lapis">
              {trabalho.saiu} resolvidos · {trabalho.entrou} entraram
            </span>
          </div>
          <p className="text-xs text-lapis">
            {trabalho.boa
              ? "O acumulado está diminuindo e houve entregas novas."
              : trabalho.saiu + trabalho.entrou + trabalho.novasEntregues === 0
                ? "Nada movimentado ainda nesta semana."
                : `${trabalho.novasEntregues} entregas novas.`}
          </p>
        </div>
      </div>
    </Painel>
  );
}
