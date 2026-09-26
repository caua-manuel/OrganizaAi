/* Tela de Finanças: resumo do mês, metas de poupança, meta mensal,
   comer fora, gastos por categoria e lançamentos. */
import { useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { criarAporte } from "../../db/acoes";
import { nomeOrigem } from "../../db/types";
import type { IncomeSource } from "../../db/types";
import { fmtData, fmtMes, mesAnterior, semanaAtual, ultimasSemanas } from "../../lib/datas";
import { formatarReais, lerReais, reais } from "../../lib/dinheiro";
import { gastoNaSemana, gastosPorCategoria, resumoMes } from "../../lib/financas";
import { GraficoBarras } from "../../ui/GraficoBarras";
import { useToast } from "../../ui/Toast";
import { Barra, Botao, Cabecalho, Painel, Vazio } from "../../ui/ui";
import { Lancamentos } from "./Lancamentos";
import { useFinancas } from "./useFinancas";
import type { DadosFinancas } from "./useFinancas";

const VERDE = "var(--pilar-financas)";

export function Financas() {
  const f = useFinancas();
  const [mes, setMes] = useState<string | null>(null);
  if (!f) return null;
  const mesVisto = mes ?? f.mes;

  return (
    <>
      <Cabecalho
        titulo="Finanças"
        acoes={
          <Link
            to="/financas/importar"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-linha bg-folha px-3.5 py-2 text-sm font-medium hover:bg-papel"
          >
            <Upload size={16} aria-hidden="true" /> Importar extrato
          </Link>
        }
      />

      <div className="grid gap-4">
        <MetasPoupanca f={f} />

        <div className="flex items-center gap-1">
          <Botao variante="fantasma" tamanho="p" aria-label="Mês anterior" onClick={() => setMes(mesAnterior(mesVisto))}>
            <ChevronLeft size={18} />
          </Botao>
          <h2 className="min-w-44 text-center text-lg font-semibold first-letter:uppercase">{fmtMes(mesVisto)}</h2>
          <Botao
            variante="fantasma"
            tamanho="p"
            aria-label="Próximo mês"
            disabled={mesVisto >= f.mes}
            onClick={() => setMes(mesAnterior(mesVisto, -1))}
          >
            <ChevronRight size={18} />
          </Botao>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ResumoDoMes f={f} mes={mesVisto} />
          <MetaDoMes f={f} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ComerFora f={f} />
          <GastosPorCategoria f={f} mes={mesVisto} />
        </div>

        <Lancamentos f={f} mes={mesVisto} />
      </div>
    </>
  );
}

function ResumoDoMes({ f, mes }: { f: DadosFinancas; mes: string }) {
  const r = resumoMes(mes, f.txs);
  const origens = [...r.porOrigem.entries()].sort((a, b) => b[1] - a[1]);
  return (
    <Painel titulo="Resumo do mês" pilar="financas">
      <dl className="grid grid-cols-3 gap-2">
        {[
          ["Entradas", r.entradas],
          ["Saídas", r.saidas],
          ["Sobra", r.sobra],
        ].map(([nome, v]) => (
          <div key={nome as string}>
            <dt className="text-xs text-lapis">{nome}</dt>
            <dd className="num text-lg font-semibold">{formatarReais(v as number)}</dd>
          </div>
        ))}
      </dl>
      {origens.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-linha pt-3 text-sm">
          {origens.map(([origem, v]) => (
            <li key={origem} className="flex justify-between">
              <span className="text-lapis">{nomeOrigem(origem as IncomeSource)}</span>
              <span className="num">{reais(v)}</span>
            </li>
          ))}
        </ul>
      )}
    </Painel>
  );
}

function MetaDoMes({ f }: { f: DadosFinancas }) {
  const voip = f.metaDoMes - f.settings.monthlySavingsBase;
  const falta = Math.max(0, f.metaDoMes - f.guardadoMes);
  return (
    <Painel titulo="Meta de guardar este mês" pilar="financas">
      <div className="num mb-2 text-2xl font-semibold">
        {reais(f.guardadoMes)} <span className="text-base font-normal text-lapis">de {reais(f.metaDoMes)}</span>
      </div>
      <Barra valor={f.guardadoMes} meta={f.metaDoMes} cor={VERDE} rotulo="Meta de guardar do mês" />
      <p className="mt-2 text-sm text-lapis">
        Base de {reais(f.settings.monthlySavingsBase)}
        {voip > 0 && <> + {reais(voip)} do VoIP</>}.{" "}
        {falta > 0 ? <>Faltam {reais(falta)}.</> : <>Meta do mês batida.</>}
      </p>
    </Painel>
  );
}

function MetasPoupanca({ f }: { f: DadosFinancas }) {
  const avisar = useToast();
  const [aberta, setAberta] = useState<string | null>(null);
  const [valor, setValor] = useState("");

  async function registrar(goalId: string, sinal: 1 | -1, nome: string) {
    const c = lerReais(valor);
    if (!c || c <= 0) return;
    const desfazer = await criarAporte(goalId, sinal * c);
    avisar(`${sinal > 0 ? "Guardado" : "Retirado"} ${reais(c)} ${sinal > 0 ? "em" : "de"} ${nome}`, desfazer);
    setValor("");
    setAberta(null);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {f.metas.map(({ meta, alvo, automatico, saldo, projecao }) => (
        <Painel key={meta.id} titulo={meta.name} pilar="financas">
          <div className="num text-2xl font-semibold">
            {reais(saldo)} {alvo > 0 && <span className="text-base font-normal text-lapis">de {reais(alvo)}</span>}
          </div>
          {alvo > 0 && (
            <div className="my-2">
              <Barra valor={saldo} meta={alvo} cor={VERDE} rotulo={`Progresso: ${meta.name}`} />
            </div>
          )}
          <ul className="space-y-0.5 text-sm text-lapis">
            {alvo > 0 && saldo < alvo && <li>Faltam {reais(alvo - saldo)}</li>}
            {alvo === 0 && (
              <li>
                Sem valor definido.{" "}
                <Link to="/configuracoes#poupanca" className="text-grafite underline underline-offset-2">
                  Definir
                </Link>
              </li>
            )}
            {meta.autoTarget && (
              <li>
                {automatico
                  ? `Alvo automático: ${meta.autoTarget.monthsOfExpenses} × gasto médio de ${reais(f.gastoMedio ?? 0)}`
                  : "Alvo manual até ter 3 meses de gastos lançados"}
              </li>
            )}
            {projecao.tipo === "estimada" && (
              <li>
                Aporte médio de {reais(projecao.mediaMensal)}/mês. No ritmo atual, você chega lá em{" "}
                <strong className="text-grafite">{fmtData(projecao.data, "MMMM 'de' yyyy")}</strong>.
              </li>
            )}
            {projecao.tipo === "sem-dados" && alvo > 0 && <li>Sem projeção ainda: faça o primeiro aporte.</li>}
            {projecao.tipo === "atingida" && <li className="font-medium text-grafite">Meta atingida.</li>}
          </ul>

          {aberta === meta.id ? (
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                registrar(meta.id, 1, meta.name);
              }}
            >
              <label className="sr-only" htmlFor={`aporte-${meta.id}`}>
                Valor
              </label>
              <input
                id={`aporte-${meta.id}`}
                autoFocus
                inputMode="decimal"
                className="campo max-w-36"
                placeholder="R$ 0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
              <Botao type="submit" variante="primario">
                Guardar
              </Botao>
              <Botao onClick={() => registrar(meta.id, -1, meta.name)}>Retirar</Botao>
              <Botao variante="fantasma" onClick={() => setAberta(null)}>
                Cancelar
              </Botao>
            </form>
          ) : (
            <Botao className="mt-3" onClick={() => (setAberta(meta.id), setValor(""))}>
              Registrar aporte
            </Botao>
          )}
        </Painel>
      ))}
    </div>
  );
}

function ComerFora({ f }: { f: DadosFinancas }) {
  const cat = f.cats.find((c) => c.name === "Comer fora");
  if (!cat) return null;
  const semana = semanaAtual(f.hoje);
  const gasto = gastoNaSemana(cat.id, semana, f.txs);
  const limite = cat.weeklyLimit ?? 0;
  const historico = ultimasSemanas(8, f.hoje).map((s) => ({
    rotulo: fmtData(s.inicio, "dd/MM"),
    detalhe: `Semana de ${fmtData(s.inicio)}`,
    valor: gastoNaSemana(cat.id, s, f.txs) / 100,
  }));
  return (
    <Painel titulo="Comer fora" cor={cat.color}>
      <div className="num mb-2 text-2xl font-semibold">
        {reais(gasto)} {limite > 0 && <span className="text-base font-normal text-lapis">de {reais(limite)} na semana</span>}
      </div>
      {limite > 0 && <Barra valor={gasto} meta={limite} cor={cat.color} rotulo="Comer fora na semana" />}
      <p className="mt-2 mb-3 text-sm text-lapis">
        {limite === 0
          ? "Defina um limite semanal em Configurações."
          : gasto <= limite
            ? `Ainda cabem ${reais(limite - gasto)} até domingo.`
            : `Passou ${reais(gasto - limite)} do limite. Semana que vem começa do zero.`}
      </p>
      <GraficoBarras
        titulo="Comer fora nas últimas 8 semanas"
        dados={historico}
        cor={cat.color}
        formatar={(v) => `R$ ${Math.round(v)}`}
        referencia={limite > 0 ? { valor: limite / 100, rotulo: "limite" } : undefined}
      />
    </Painel>
  );
}

function GastosPorCategoria({ f, mes }: { f: DadosFinancas; mes: string }) {
  const linhas = gastosPorCategoria(mes, f.txs, f.cats);
  const maior = Math.max(1, ...linhas.flatMap((l) => [l.atual, l.media ?? 0]));
  return (
    <Painel titulo="Gastos por categoria" pilar="financas">
      {linhas.length === 0 ? (
        <Vazio>Nenhum gasto neste mês. Registre com + ou importe um extrato.</Vazio>
      ) : (
        <>
          <p className="mb-3 text-xs text-lapis">Barra = este mês · traço = média dos meses anteriores</p>
          <ul className="space-y-2.5">
            {linhas.map(({ categoria, atual, media }) => (
              <li key={categoria.id}>
                <div className="mb-1 flex justify-between gap-2 text-sm">
                  <span>{categoria.name}</span>
                  <span className="num">
                    {reais(atual)}
                    {media != null && <span className="text-lapis"> · média {reais(media)}</span>}
                  </span>
                </div>
                <div className="relative h-2 rounded-full" style={{ background: "var(--cor-linha)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(atual / maior) * 100}%`, background: categoria.color }}
                  />
                  {media != null && media > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 h-4 w-0.5 rounded bg-grafite"
                      style={{ left: `calc(${(media / maior) * 100}% - 1px)` }}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Painel>
  );
}
