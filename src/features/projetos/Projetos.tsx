/* Projetos: cards com status, PRÓXIMO PASSO em destaque e minutos na
   semana; meta semanal de foco e o gráfico de minutos por semana ao
   longo dos 6 meses (o indicador de "ter mais tempo para projetos"). */
import { useState } from "react";
import { Link } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { criarProjeto } from "../../db/acoes";
import { useSettings } from "../../db/hooks";
import type { Project } from "../../db/types";
import { dentro, fmtData, hojeISO, semanaAtual, somarDias } from "../../lib/datas";
import { progressoHabito } from "../../lib/habitos";
import { GraficoBarras } from "../../ui/GraficoBarras";
import { Botao, Cabecalho, Chip, Etiqueta, Indicador, Painel, Vazio } from "../../ui/ui";
import { textoHabito, useHabitos } from "../saude/useHabitos";

const ROSA = "var(--pilar-projetos)";
export const STATUS: Record<Project["status"], string> = { ativo: "Ativo", pausado: "Pausado", concluido: "Concluído" };

/* semanas desde o início do período (no máximo 26), até a atual */
export function semanasDoPeriodo(inicio: string) {
  const hoje = hojeISO();
  const primeira = semanaAtual(inicio < hoje ? inicio : hoje).inicio;
  const lista = [];
  for (let s = primeira; s <= hoje && lista.length < 30; s = somarDias(s, 7)) lista.push(semanaAtual(s));
  return lista.slice(-26);
}

export function Projetos() {
  const { startDate } = useSettings();
  const projetos = useLiveQuery(() => db.projects.toArray(), []);
  const sessoes = useLiveQuery(() => db.focusSessions.where("pillar").equals("projetos").toArray(), []) ?? [];
  const h = useHabitos();
  const [filtro, setFiltro] = useState<Project["status"]>("ativo");
  const [nome, setNome] = useState("");
  const [passo, setPasso] = useState("");
  if (!projetos) return null;

  const semana = semanaAtual();
  const minutosSemana = (id?: string) =>
    sessoes.filter((s) => (id ? s.projectId === id : true) && dentro(s.date, semana)).reduce((t, s) => t + s.minutes, 0);
  const habito = h?.habitos.find((x) => x.link === "foco:projetos" && x.active);
  const visiveis = projetos.filter((p) => p.status === filtro).sort((a, b) => a.name.localeCompare(b.name));
  const grafico = semanasDoPeriodo(startDate).map((s) => ({
    rotulo: fmtData(s.inicio, "dd/MM"),
    detalhe: `Semana de ${fmtData(s.inicio)}`,
    valor: sessoes.filter((x) => dentro(x.date, s)).reduce((t, x) => t + x.minutes, 0),
  }));

  return (
    <>
      <Cabecalho titulo="Projetos" sub="Seus projetos próprios, com o próximo passo sempre à vista." />
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
          <Painel titulo="Tempo nesta semana" pilar="projetos">
            {habito && h ? (
              (() => {
                const p = progressoHabito(habito, semana, h.dados);
                return <Indicador nome={habito.title} texto={textoHabito(p.valor, p.meta, "minutos")} valor={p.valor} meta={p.meta} cor={ROSA} />;
              })()
            ) : (
              <div className="num text-2xl font-semibold">{minutosSemana()} min</div>
            )}
            <p className="mt-3 text-sm text-lapis">Registre sessões com + → Foco → Projeto.</p>
          </Painel>
          <Painel titulo="Minutos por semana" pilar="projetos">
            <GraficoBarras
              titulo="Minutos em projetos por semana desde o início do período"
              dados={grafico}
              cor={ROSA}
              formatar={(v) => `${v}`}
              referencia={habito ? { valor: habito.weeklyTarget, rotulo: "meta" } : undefined}
              altura={150}
            />
          </Painel>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5" role="group" aria-label="Filtrar por status">
            {(Object.keys(STATUS) as Project["status"][]).map((s) => (
              <Chip key={s} ativo={filtro === s} cor={ROSA} onClick={() => setFiltro(s)}>
                {STATUS[s]} · {projetos.filter((p) => p.status === s).length}
              </Chip>
            ))}
          </div>
        </div>

        {visiveis.length === 0 ? (
          <Painel>
            <Vazio>{filtro === "ativo" ? "Nenhum projeto ativo. Crie o primeiro abaixo." : `Nenhum projeto ${STATUS[filtro].toLowerCase()}.`}</Vazio>
          </Painel>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {visiveis.map((p) => (
              <Link
                key={p.id}
                to={`/projetos/${p.id}`}
                className="relative block rounded-2xl border border-linha bg-folha p-4 transition-colors hover:border-lapis sm:p-5"
              >
                <span aria-hidden="true" className="absolute top-4 bottom-4 -left-px w-1 rounded-r-full" style={{ background: ROSA }} />
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{p.name}</h2>
                  <span className="num shrink-0 text-sm text-lapis">{minutosSemana(p.id)} min</span>
                </div>
                <p className="text-xs text-lapis">Próximo passo</p>
                <p className="mt-0.5">
                  {p.nextStep ? <Etiqueta cor={ROSA}>{p.nextStep}</Etiqueta> : <span className="text-sm text-lapis">Defina o próximo passo</span>}
                </p>
              </Link>
            ))}
          </div>
        )}

        <Painel titulo="Novo projeto" pilar="projetos">
          <form
            className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!nome.trim()) return;
              await criarProjeto(nome, passo);
              setNome("");
              setPasso("");
              setFiltro("ativo");
            }}
          >
            <input aria-label="Nome do projeto" className="campo" placeholder="Nome do projeto" value={nome} onChange={(e) => setNome(e.target.value)} />
            <input aria-label="Próximo passo" className="campo" placeholder="Próximo passo (opcional)" value={passo} onChange={(e) => setPasso(e.target.value)} />
            <Botao type="submit" variante="primario">
              Criar
            </Botao>
          </form>
        </Painel>
      </div>
    </>
  );
}
