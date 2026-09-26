/* Saúde: semana atual, sequência de semanas, sugestão de subir a meta,
   calendário dos últimos 3 meses e treinos recentes. */
import { Trash2 } from "lucide-react";
import { apagarTreino, atualizarHabito, registrarHabito } from "../../db/acoes";
import type { Workout } from "../../db/types";
import { fmtData, hojeISO, semanaAtual, somarDias } from "../../lib/datas";
import { progressoHabito, semanasSeguidas, sugestoesDeMeta } from "../../lib/habitos";
import { useToast } from "../../ui/Toast";
import { Botao, Cabecalho, Indicador, Painel, Vazio } from "../../ui/ui";
import { textoHabito, useHabitos } from "./useHabitos";

const COR: Record<Workout["type"], string> = {
  academia: "var(--pilar-saude)",
  jiujitsu: "var(--pilar-trabalho)",
};
const NOME: Record<Workout["type"], string> = { academia: "Academia", jiujitsu: "Jiu-jitsu" };

export function Saude() {
  const h = useHabitos();
  const avisar = useToast();
  if (!h) return null;
  const hoje = hojeISO();
  const semana = semanaAtual(hoje);
  const doPilar = h.habitos.filter((x) => x.pillar === "saude" && x.active);
  const treinos = doPilar.filter((x) => x.link?.startsWith("treino:"));
  const seguidas = semanasSeguidas(treinos, h.dados, hoje);
  const sugestoes = sugestoesDeMeta(h.habitos, h.dados, hoje);
  const recentes = [...h.dados.workouts].reverse().slice(0, 8);

  return (
    <>
      <Cabecalho
        titulo="Saúde"
        sub={
          seguidas > 0
            ? `${seguidas} ${seguidas === 1 ? "semana" : "semanas"} seguidas batendo a meta de treino`
            : "Metas por semana: uma semana ruim não quebra nada."
        }
      />
      <div className="grid gap-4">
        {sugestoes.length > 0 && (
          <Painel pilar="saude">
            <p className="mb-3 text-sm">3 semanas seguidas cumpridas. Quer subir a meta?</p>
            <div className="flex flex-wrap gap-2">
              {sugestoes.map(({ habito, novaMeta }) => (
                <Botao
                  key={habito.id}
                  onClick={async () => {
                    await atualizarHabito(habito.id, { weeklyTarget: novaMeta });
                    avisar(`${habito.title}: nova meta de ${novaMeta}× por semana`);
                  }}
                >
                  {habito.title}: {habito.weeklyTarget}× → {novaMeta}×
                </Botao>
              ))}
            </div>
          </Painel>
        )}

        <Painel titulo="Esta semana" pilar="saude">
          {doPilar.length === 0 ? (
            <Vazio>Nenhum hábito de saúde ativo. Ative em Configurações.</Vazio>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {doPilar.map((habito) => {
                const p = progressoHabito(habito, semana, h.dados);
                return (
                  <div key={habito.id} className="flex items-end gap-3">
                    <div className="flex-1">
                      <Indicador
                        nome={habito.title}
                        texto={textoHabito(p.valor, p.meta, habito.unit)}
                        valor={p.valor}
                        meta={p.meta}
                        cor="var(--pilar-saude)"
                      />
                    </div>
                    {!habito.link && (
                      <Botao
                        tamanho="p"
                        aria-label={`Registrar ${habito.title}`}
                        onClick={async () => avisar(`${habito.title} registrado`, await registrarHabito(habito.id))}
                      >
                        +1
                      </Botao>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {treinos.length > 0 && semana && progressoHabito(treinos[0], semana, h.dados).valor === 0 && (
            <p className="mt-3 text-sm text-lapis">Nenhum treino esta semana. Registre com +.</p>
          )}
        </Painel>

        <Painel titulo="Últimos 3 meses" pilar="saude">
          <Calendario workouts={h.dados.workouts} hoje={hoje} />
        </Painel>

        <Painel titulo="Treinos recentes" pilar="saude">
          {recentes.length === 0 ? (
            <Vazio>Nenhum treino registrado. Use + e toque em Academia ou Jiu-jitsu.</Vazio>
          ) : (
            <ul className="divide-y divide-linha">
              {recentes.map((w) => (
                <li key={w.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="size-2.5 rounded-full" style={{ background: COR[w.type] }} aria-hidden="true" />
                  <span className="w-28 text-lapis first-letter:uppercase">{fmtData(w.date, "EEE, d MMM")}</span>
                  <span className="flex-1">
                    {NOME[w.type]}
                    {w.focus && <span className="text-lapis"> · {w.focus}</span>}
                  </span>
                  <button
                    type="button"
                    aria-label={`Apagar treino de ${fmtData(w.date)}`}
                    className="rounded-lg p-1.5 text-lapis hover:bg-papel hover:text-grafite"
                    onClick={async () => avisar("Treino apagado", await apagarTreino(w.id))}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Painel>
      </div>
    </>
  );
}

/* Grade estilo "contribuições": colunas = semanas, linhas = dias
   (segunda em cima). Cada dia pinta pelo tipo de treino; dois treinos
   no mesmo dia dividem o quadrado na diagonal. A legenda escreve os
   nomes, então a cor nunca é a única pista. */
function Calendario({ workouts, hoje }: { workouts: Workout[]; hoje: string }) {
  const SEMANAS = 13;
  const primeira = somarDias(semanaAtual(hoje).inicio, -7 * (SEMANAS - 1));
  const porDia = new Map<string, Set<Workout["type"]>>();
  for (const w of workouts) {
    if (w.date < primeira) continue;
    if (!porDia.has(w.date)) porDia.set(w.date, new Set());
    porDia.get(w.date)!.add(w.type);
  }
  const colunas = Array.from({ length: SEMANAS }, (_, s) => Array.from({ length: 7 }, (_, d) => somarDias(primeira, s * 7 + d)));
  const fundo = (tipos?: Set<Workout["type"]>) => {
    if (!tipos?.size) return "var(--cor-linha)";
    if (tipos.size === 2) return `linear-gradient(135deg, ${COR.academia} 50%, ${COR.jiujitsu} 50%)`;
    return COR[[...tipos][0]];
  };

  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto pb-1" role="img" aria-label="Calendário de treinos dos últimos 3 meses">
        <div className="mr-1 grid grid-rows-7 gap-[3px] text-[0.625rem] text-lapis" aria-hidden="true">
          {["seg", "", "qua", "", "sex", "", "dom"].map((d, i) => (
            <span key={i} className="flex h-4 items-center leading-none">
              {d}
            </span>
          ))}
        </div>
        {colunas.map((dias) => (
          <div key={dias[0]} className="grid grid-rows-7 gap-[3px]">
            {dias.map((dia) => {
              const tipos = porDia.get(dia);
              const futuro = dia > hoje;
              return (
                <span
                  key={dia}
                  title={`${fmtData(dia)}${tipos?.size ? ": " + [...tipos].map((t) => NOME[t]).join(" + ") : ""}`}
                  className="size-4 rounded-[4px]"
                  style={{ background: futuro ? "transparent" : fundo(tipos), outline: dia === hoje ? "1.5px solid var(--cor-grafite)" : undefined }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-lapis">
        {(["academia", "jiujitsu"] as const).map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px]" style={{ background: COR[t] }} aria-hidden="true" />
            {NOME[t]}
          </span>
        ))}
      </div>
    </div>
  );
}
