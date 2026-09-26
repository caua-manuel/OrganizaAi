/* Revisão semanal em 3 passos:
   1. o resultado da semana em cada pilar (automático);
   2. três respostas curtas;
   3. esvaziar a caixa de ideias.
   Salva um WeeklyReview com o snapshot; a lista de revisões vira o
   histórico da evolução. */
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { salvarRevisao } from "../../db/acoes";
import { PILARES } from "../../db/types";
import type { Pillar, WeeklyReview } from "../../db/types";
import { diaDaSemana, fmtData, hojeISO, semanaAtual } from "../../lib/datas";
import { reais } from "../../lib/dinheiro";
import { diaDeRevisao } from "../../lib/revisao";
import { GraficoBarras } from "../../ui/GraficoBarras";
import { useToast } from "../../ui/Toast";
import { Barra, Botao, Cabecalho, Painel, Vazio, corPilar } from "../../ui/ui";
import { CaixaIdeias } from "../hoje/CaixaIdeias";
import { textoHabito } from "../saude/useHabitos";
import { useResumoSemana } from "./useResumoSemana";

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function Revisao() {
  const hoje = hojeISO();
  const semana = semanaAtual(hoje);
  const resumo = useResumoSemana(semana);
  const revisoes = useLiveQuery(() => db.weeklyReviews.orderBy("weekStart").toArray(), []) ?? [];
  const existente = revisoes.find((r) => r.weekStart === semana.inicio);
  const [passo, setPasso] = useState(1);
  const [campos, setCampos] = useState({ wentWell: "", gotStuck: "", nextWeekPriority: "" });
  const [carregou, setCarregou] = useState(false);
  const avisar = useToast();

  /* se a revisão da semana já existe, os campos voltam preenchidos */
  useEffect(() => {
    if (existente && !carregou) {
      setCampos({ wentWell: existente.wentWell, gotStuck: existente.gotStuck, nextWeekPriority: existente.nextWeekPriority });
      setCarregou(true);
    }
  }, [existente, carregou]);

  if (!resumo) return null;
  const aberta = diaDeRevisao(diaDaSemana(hoje));

  async function salvar() {
    await salvarRevisao({ weekStart: semana.inicio, ...campos, snapshot: resumo!.snapshot });
    avisar(existente ? "Revisão atualizada" : "Revisão da semana salva ✓");
    setPasso(1);
  }

  return (
    <>
      <Cabecalho
        titulo="Revisão semanal"
        sub={`Semana de ${fmtData(semana.inicio)} a ${fmtData(semana.fim)}${existente ? " · já revisada" : ""}`}
      />
      <div className="grid gap-4">
        {!aberta && !existente && (
          <p className="text-sm text-lapis">A revisão é pensada para sexta a domingo, mas dá para fazer quando quiser.</p>
        )}

        <ol className="flex gap-2 text-sm" aria-label="Passos">
          {["Resultado", "Reflexão", "Caixa de ideias"].map((nome, i) => (
            <li key={nome}>
              <button
                type="button"
                aria-current={passo === i + 1 ? "step" : undefined}
                onClick={() => setPasso(i + 1)}
                className={`rounded-lg px-2.5 py-1 ${passo === i + 1 ? "bg-grafite font-medium text-papel" : "text-lapis hover:text-grafite"}`}
              >
                {i + 1}. {nome}
              </button>
            </li>
          ))}
        </ol>

        {passo === 1 && (
          <Painel titulo="Como foi a semana">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PILARES.map((p) => (
                <div key={p.id} className="rounded-xl border border-linha p-3">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold">{p.nome}</span>
                    <span className="num">{pct(resumo.snapshot[p.id])}</span>
                  </div>
                  <Barra valor={resumo.snapshot[p.id]} meta={1} cor={corPilar(p.id)} altura={6} rotulo={`${p.nome} na semana`} />
                  <ul className="mt-2 space-y-0.5 text-xs text-lapis">
                    <Detalhes pilar={p.id} resumo={resumo} />
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Botao variante="primario" onClick={() => setPasso(2)}>
                Próximo
              </Botao>
            </div>
          </Painel>
        )}

        {passo === 2 && (
          <Painel titulo="Três perguntas rápidas">
            <div className="grid gap-3">
              {(
                [
                  ["wentWell", "O que foi bem?"],
                  ["gotStuck", "O que travou?"],
                  ["nextWeekPriority", "Qual a prioridade da próxima semana?"],
                ] as const
              ).map(([chave, pergunta], i) => (
                <div key={chave}>
                  <label className="rotulo" htmlFor={chave}>
                    {pergunta}
                  </label>
                  <textarea
                    id={chave}
                    rows={2}
                    autoFocus={i === 0}
                    maxLength={400}
                    className="campo"
                    value={campos[chave]}
                    onChange={(e) => setCampos({ ...campos, [chave]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between">
              <Botao variante="fantasma" onClick={() => setPasso(1)}>
                Voltar
              </Botao>
              <Botao variante="primario" onClick={() => setPasso(3)}>
                Próximo
              </Botao>
            </div>
          </Painel>
        )}

        {passo === 3 && (
          <Painel titulo="Esvaziar a caixa de ideias">
            <p className="mb-2 text-sm text-lapis">Decida cada ideia: vira tarefa, vai para um projeto ou sai da caixa.</p>
            <CaixaIdeias semCampo />
            <div className="mt-4 flex justify-between">
              <Botao variante="fantasma" onClick={() => setPasso(2)}>
                Voltar
              </Botao>
              <Botao variante="primario" onClick={salvar}>
                {existente ? "Atualizar revisão" : "Concluir revisão"}
              </Botao>
            </div>
          </Painel>
        )}

        <Evolucao revisoes={revisoes} />
        <Historico revisoes={revisoes} />
      </div>
    </>
  );
}

function Detalhes({ pilar, resumo }: { pilar: Pillar; resumo: NonNullable<ReturnType<typeof useResumoSemana>> }) {
  const habitos = resumo.habitos.filter((h) => h.habito.pillar === pilar);
  const linhas: string[] = habitos.map((h) => `${h.habito.title}: ${textoHabito(h.valor, h.meta, h.habito.unit)}`);
  if (pilar === "financas") {
    if (resumo.comerFora?.limite) linhas.push(`Comer fora: ${reais(resumo.comerFora.gasto)} de ${reais(resumo.comerFora.limite)}`);
    linhas.push(`Guardado na semana: ${reais(resumo.guardadoSemana)}`);
    linhas.push(`No mês: ${reais(resumo.poupancaMes.guardado)} de ${reais(resumo.poupancaMes.meta)}`);
  }
  if (pilar === "trabalho") {
    const t = resumo.trabalho;
    linhas.push(`Acumulado: ${t.saiu} resolvidos, ${t.entrou} entraram`, `Entregas novas: ${t.novasEntregues}`);
  }
  if (pilar === "estudos")
    for (const a of resumo.avaliacoes) linhas.push(`${a.title} de ${a.materia}${a.grade != null ? `: ${String(a.grade).replace(".", ",")}` : ""}`);
  if (!linhas.length) linhas.push("Sem metas semanais neste pilar.");
  return (
    <>
      {linhas.map((l) => (
        <li key={l}>{l}</li>
      ))}
    </>
  );
}

/* Pequenos múltiplos: um gráfico por pilar, mesma escala (0–100%). */
function Evolucao({ revisoes }: { revisoes: WeeklyReview[] }) {
  const ultimas = revisoes.slice(-12);
  return (
    <Painel titulo="Evolução">
      {ultimas.length < 2 ? (
        <Vazio>A evolução aparece aqui a partir da segunda revisão salva.</Vazio>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILARES.map((p) => (
            <div key={p.id}>
              <h3 className="mb-1 text-sm font-semibold">{p.nome}</h3>
              <GraficoBarras
                titulo={`${p.nome}: % das metas semanais por revisão`}
                dados={ultimas.map((r) => ({
                  rotulo: fmtData(r.weekStart, "dd/MM"),
                  detalhe: `Semana de ${fmtData(r.weekStart)}`,
                  valor: Math.round((r.snapshot[p.id] ?? 0) * 100),
                }))}
                cor={corPilar(p.id)!}
                formatar={(v) => `${v}%`}
                referencia={{ valor: 100, rotulo: "" }}
                altura={120}
              />
            </div>
          ))}
        </div>
      )}
    </Painel>
  );
}

function Historico({ revisoes }: { revisoes: WeeklyReview[] }) {
  if (!revisoes.length) return null;
  return (
    <Painel titulo="Revisões anteriores">
      <ul className="divide-y divide-linha">
        {[...revisoes].reverse().map((r) => (
          <li key={r.id} className="py-2">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium">Semana de {fmtData(r.weekStart)}</span>
                {PILARES.map((p) => (
                  <span key={p.id} className="num text-xs text-lapis">
                    {p.nome} {pct(r.snapshot[p.id] ?? 0)}
                  </span>
                ))}
              </summary>
              <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                {(
                  [
                    ["Foi bem", r.wentWell],
                    ["Travou", r.gotStuck],
                    ["Prioridade", r.nextWeekPriority],
                  ] as const
                ).map(([t, v]) => (
                  <div key={t}>
                    <dt className="text-xs text-lapis">{t}</dt>
                    <dd className="whitespace-pre-wrap">{v || "—"}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </li>
        ))}
      </ul>
    </Painel>
  );
}
