/* Trabalho: duas colunas (Acumulado e Novo), filtro por área, balanço
   da semana e o gráfico do tamanho do acumulado. */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeftRight, CalendarPlus, Trash2 } from "lucide-react";
import { db } from "../../db/db";
import { alternarTarefa, apagarTarefa, atualizarTarefa, criarTarefa, puxarParaHoje } from "../../db/acoes";
import { useSettings } from "../../db/hooks";
import type { Task } from "../../db/types";
import { fmtData, hojeISO, semanaAtual, ultimasSemanas } from "../../lib/datas";
import { balancoSemana, diaDe, tamanhoEm } from "../../lib/trabalho";
import { GraficoBarras } from "../../ui/GraficoBarras";
import { useToast } from "../../ui/Toast";
import { Botao, Cabecalho, Chip, Etiqueta, Painel, Vazio } from "../../ui/ui";

const AZUL = "var(--pilar-trabalho)";
type Tipo = NonNullable<Task["kind"]>;

export function Trabalho() {
  const { workAreas } = useSettings();
  const tarefas = useLiveQuery(() => db.tasks.where("pillar").equals("trabalho").sortBy("createdAt"), []);
  const [area, setArea] = useState<string | null>(null);
  if (!tarefas) return null;

  const semana = semanaAtual();
  const b = balancoSemana(tarefas, semana);
  const acumulado = tarefas.filter((t) => t.kind === "acumulado");
  const grafico = ultimasSemanas(8).map((s) => ({
    rotulo: fmtData(s.inicio, "dd/MM"),
    detalhe: `Fim da semana de ${fmtData(s.inicio)}`,
    valor: tamanhoEm(acumulado, s.fim > hojeISO() ? hojeISO() : s.fim),
  }));
  const visiveis = area ? tarefas.filter((t) => t.workArea === area) : tarefas;

  return (
    <>
      <Cabecalho titulo="Trabalho" sub="Resolver o acumulado enquanto cria coisas novas." />
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
          <Painel titulo="Esta semana" pilar="trabalho">
            <dl className="grid grid-cols-3 gap-2">
              <Numero rotulo="Resolvidos" valor={b.saiu} />
              <Numero rotulo="Entraram" valor={b.entrou} />
              <Numero rotulo="Entregas novas" valor={b.novasEntregues} />
            </dl>
            <p className="mt-3 text-sm text-lapis">
              {b.boa
                ? "Boa semana: o acumulado diminuiu e houve entregas novas."
                : b.saiu > b.entrou
                  ? "O acumulado está diminuindo. Uma entrega nova fecha a semana bem."
                  : b.novasEntregues > 0
                    ? "Entregas novas saindo. Resolver um acumulado equilibra a semana."
                    : `Acumulado atual: ${b.tamanhoFim}. Comece pelo mais antigo.`}
            </p>
          </Painel>
          <Painel titulo="Tamanho do acumulado" pilar="trabalho">
            <GraficoBarras titulo="Tamanho do acumulado no fim de cada semana" dados={grafico} cor={AZUL} altura={140} />
          </Painel>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por área">
          <Chip ativo={area === null} cor={AZUL} onClick={() => setArea(null)}>
            Todas
          </Chip>
          {workAreas.map((a) => (
            <Chip key={a} ativo={area === a} cor={AZUL} onClick={() => setArea(area === a ? null : a)}>
              {a}
            </Chip>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Coluna tipo="acumulado" titulo="Acumulado" tarefas={visiveis} areas={workAreas} areaPadrao={area} />
          <Coluna tipo="novo" titulo="Novo" tarefas={visiveis} areas={workAreas} areaPadrao={area} />
        </div>
      </div>
    </>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div>
      <dt className="text-xs text-lapis">{rotulo}</dt>
      <dd className="num text-2xl font-semibold">{valor}</dd>
    </div>
  );
}

function Coluna({
  tipo,
  titulo,
  tarefas,
  areas,
  areaPadrao,
}: {
  tipo: Tipo;
  titulo: string;
  tarefas: Task[];
  areas: string[];
  areaPadrao: string | null;
}) {
  const avisar = useToast();
  const [texto, setTexto] = useState("");
  const [area, setArea] = useState("");
  const semana = semanaAtual();
  const abertas = tarefas.filter((t) => t.kind === tipo && !t.doneAt);
  const feitasSemana = tarefas.filter((t) => t.kind === tipo && t.doneAt && diaDe(t.doneAt) >= semana.inicio);
  const outro: Tipo = tipo === "acumulado" ? "novo" : "acumulado";

  return (
    <Painel titulo={`${titulo} · ${abertas.length}`} pilar="trabalho">
      <form
        className="mb-2 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!texto.trim()) return;
          await criarTarefa({ title: texto, pillar: "trabalho", kind: tipo, workArea: area || areaPadrao || undefined });
          setTexto("");
        }}
      >
        <label className="sr-only" htmlFor={`nova-${tipo}`}>
          Nova tarefa em {titulo}
        </label>
        <input
          id={`nova-${tipo}`}
          className="campo"
          placeholder={tipo === "acumulado" ? "Algo pendente…" : "Algo novo para criar…"}
          value={texto}
          maxLength={80}
          onChange={(e) => setTexto(e.target.value)}
        />
        <select aria-label="Área" className="campo w-auto" value={area || areaPadrao || ""} onChange={(e) => setArea(e.target.value)}>
          <option value="">Área</option>
          {areas.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </form>

      {abertas.length === 0 ? (
        <Vazio>{tipo === "acumulado" ? "Nada acumulado aqui." : "Nenhuma ideia nova em andamento."}</Vazio>
      ) : (
        <ul className="divide-y divide-linha">
          {abertas.map((t) => (
            <li key={t.id} className="flex items-center gap-2 py-1.5">
              <input
                type="checkbox"
                aria-label={`Concluir ${t.title}`}
                className="size-4 shrink-0 cursor-pointer"
                style={{ accentColor: AZUL }}
                checked={false}
                onChange={async () => {
                  await alternarTarefa(t.id);
                  avisar("Concluída", () => alternarTarefa(t.id));
                }}
              />
              <span className="min-w-0 flex-1 truncate text-sm" title={t.title}>
                {t.title}
              </span>
              {t.workArea && <Etiqueta cor={AZUL}>{t.workArea}</Etiqueta>}
              {t.plannedFor === hojeISO() && <Etiqueta cor="var(--pilar-financas)">hoje</Etiqueta>}
              <div className="flex">
                {t.plannedFor !== hojeISO() && (
                  <button
                    type="button"
                    title="Fazer hoje"
                    aria-label={`Fazer hoje: ${t.title}`}
                    className="rounded-lg p-1.5 text-lapis hover:bg-papel hover:text-grafite"
                    onClick={async () => avisar((await puxarParaHoje(t.id)) ? "Está nas tarefas de hoje" : "O dia já tem 5 tarefas")}
                  >
                    <CalendarPlus size={14} />
                  </button>
                )}
                <button
                  type="button"
                  title={`Mover para ${outro === "novo" ? "Novo" : "Acumulado"}`}
                  aria-label={`Mover ${t.title} para ${outro}`}
                  className="rounded-lg p-1.5 text-lapis hover:bg-papel hover:text-grafite"
                  onClick={() => atualizarTarefa(t.id, { kind: outro })}
                >
                  <ArrowLeftRight size={14} />
                </button>
                <button
                  type="button"
                  aria-label={`Apagar ${t.title}`}
                  className="rounded-lg p-1.5 text-lapis hover:bg-papel hover:text-grafite"
                  onClick={async () => avisar("Tarefa apagada", await apagarTarefa(t.id))}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {feitasSemana.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-lapis">{feitasSemana.length} concluídas nesta semana</summary>
          <ul className="mt-1">
            {feitasSemana.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 py-1 text-lapis">
                <span className="truncate line-through">{t.title}</span>
                <Botao tamanho="p" variante="fantasma" onClick={() => alternarTarefa(t.id)}>
                  Reabrir
                </Botao>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Painel>
  );
}
