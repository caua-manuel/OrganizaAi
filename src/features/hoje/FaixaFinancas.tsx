/* A faixa de finanças: o ÚNICO elemento de destaque do app. Mostra o
   progresso da viagem e da reserva e quanto foi guardado no mês. */
import { Link } from "react-router";
import { reais } from "../../lib/dinheiro";
import { fmtData } from "../../lib/datas";
import { Barra } from "../../ui/ui";
import { useFinancas } from "../financas/useFinancas";

export function FaixaFinancas() {
  const f = useFinancas();
  if (!f) return <div className="h-40 rounded-2xl bg-folha" aria-hidden="true" />;

  return (
    <section
      aria-label="Resumo de finanças"
      className="relative overflow-hidden rounded-2xl p-5 sm:p-6"
      style={{
        background: "color-mix(in srgb, var(--pilar-financas) 11%, var(--cor-folha))",
        border: "1px solid color-mix(in srgb, var(--pilar-financas) 25%, transparent)",
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {f.metas.map(({ meta, alvo, saldo, projecao }) => (
          <div key={meta.id}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{meta.name}</span>
              <span className="text-xs text-lapis">
                {projecao.tipo === "atingida"
                  ? "Meta atingida"
                  : projecao.tipo === "estimada"
                    ? `no ritmo atual: ${fmtData(projecao.data, "MMM/yyyy")}`
                    : ""}
              </span>
            </div>
            <div className="num mb-2 text-[1.75rem] leading-none font-semibold sm:text-[2rem]">
              {reais(saldo)}
              {alvo > 0 && <span className="ml-1.5 text-base font-normal text-lapis">de {reais(alvo)}</span>}
            </div>
            {alvo > 0 ? (
              <Barra valor={saldo} meta={alvo} cor="var(--pilar-financas)" altura={10} rotulo={`Progresso: ${meta.name}`} />
            ) : (
              <Link to="/configuracoes#poupanca" className="text-sm underline underline-offset-2">
                Definir o valor da meta
              </Link>
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm" style={{ borderColor: "color-mix(in srgb, var(--pilar-financas) 22%, transparent)" }}>
        <span>
          Guardado este mês: <strong className="num">{reais(f.guardadoMes)}</strong> de{" "}
          <span className="num">{reais(f.metaDoMes)}</span>
        </span>
        <Link to="/financas" className="font-medium underline underline-offset-2">
          Ver finanças
        </Link>
      </div>
    </section>
  );
}
