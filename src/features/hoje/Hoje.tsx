/* Tela Hoje: a porta de entrada. De cima para baixo: finanças,
   tarefas do dia, caixa de ideias e a semana em andamento. */
import { useState } from "react";
import { Link, Navigate } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Dumbbell } from "lucide-react";
import { db } from "../../db/db";
import { alternarTarefa, criarTarefa, puxarParaHoje, sugestoesParaHoje } from "../../db/acoes";
import type { Task } from "../../db/types";
import { useSettings } from "../../db/hooks";
import { diaDaSemana, diasEntre, fmtData, hojeISO, nomeDiaSemana, semanaAtual } from "../../lib/datas";
import { diaDeRevisao } from "../../lib/revisao";
import { useToast } from "../../ui/Toast";
import { Botao, Cabecalho, Painel, Vazio } from "../../ui/ui";
import { ChecklistHoje } from "./ChecklistHoje";
import { CaixaIdeias } from "./CaixaIdeias";
import { FaixaFinancas } from "./FaixaFinancas";
import { SemanaAndamento } from "./SemanaAndamento";

export function Hoje() {
  const hoje = hojeISO();
  const settings = useSettings();
  const lembrete = settings.treinoLembrete[diaDaSemana(hoje)];

  /* backup: lembra se o último tem mais de 7 dias (ou se nunca houve
     um e o app já está em uso há 7 dias) */
  const refBackup = settings.lastBackupAt?.slice(0, 10) ?? settings.startDate;
  const pedirBackup = diasEntre(refBackup, hoje) > 7;

  /* primeiro uso → boas-vindas. Lê o banco direto (e não o
     useSettings, que devolve padrões enquanto carrega) para não
     redirecionar por engano. */
  const salvo = useLiveQuery(() => db.settings.get("app"), []);
  const revisada = useLiveQuery(() => db.weeklyReviews.where("weekStart").equals(semanaAtual(hoje).inicio).count(), [hoje]);
  if (salvo && !salvo.onboardedAt) return <Navigate to="/boas-vindas" replace />;
  const pedirRevisao = diaDeRevisao(diaDaSemana(hoje)) && revisada === 0;

  const dia = nomeDiaSemana(hoje);
  return (
    <>
      <Cabecalho
        titulo="Hoje"
        sub={
          <>
            <span className="inline-block first-letter:uppercase">{dia}</span>, {fmtData(hoje, "d 'de' MMMM")}
          </>
        }
      />

      <div className="grid gap-4">
        <FaixaFinancas />

        {pedirRevisao && (
          <p className="rounded-xl border border-linha bg-folha px-4 py-2.5 text-sm">
            A semana está fechando. Que tal 5 minutos de revisão?{" "}
            <Link to="/revisao" className="font-medium underline underline-offset-2">
              Fazer revisão
            </Link>
          </p>
        )}

        {pedirBackup && (
          <p className="rounded-xl border border-linha bg-folha px-4 py-2.5 text-sm">
            Faz mais de uma semana desde o último backup.{" "}
            <Link to="/configuracoes" className="font-medium underline underline-offset-2">
              Exportar agora
            </Link>
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <TarefasDoDia />
          <Painel titulo="Caixa de ideias">
            <CaixaIdeias />
          </Painel>
        </div>

        <SemanaAndamento />

        {lembrete && (
          <p className="flex items-center gap-2 text-sm text-lapis">
            <Dumbbell size={16} style={{ color: "var(--pilar-saude)" }} aria-hidden="true" />
            {lembrete}
          </p>
        )}
      </div>
    </>
  );
}

function TarefasDoDia() {
  const hoje = hojeISO();
  const avisar = useToast();
  const tarefas =
    useLiveQuery(() => db.tasks.where("plannedFor").equals(hoje).sortBy("createdAt"), [hoje]) ?? [];
  const [sugestoes, setSugestoes] = useState<{ tarefa: Task; motivo: string }[] | null>(null);

  async function abrirSugestoes() {
    setSugestoes(await sugestoesParaHoje());
  }

  return (
    <Painel
      titulo="Tarefas de hoje"
      acao={
        <span className="flex items-center gap-1">
          <Botao tamanho="p" variante="fantasma" onClick={abrirSugestoes}>
            Puxar tarefas
          </Botao>
          <Link to="/tarefas" className="rounded-[10px] px-2.5 py-1 text-[0.8125rem] font-medium text-lapis hover:bg-papel hover:text-grafite">
            Ver todas
          </Link>
        </span>
      }
    >
      <ChecklistHoje
        tarefas={tarefas.map((t) => ({
          id: t.id,
          titulo: t.title,
          feita: Boolean(t.doneAt),
          cor: t.pillar ? `var(--pilar-${t.pillar})` : undefined,
        }))}
        onAlternar={(id) => alternarTarefa(id)}
        onAdicionar={(titulo) => criarTarefa({ title: titulo, plannedFor: hoje })}
      />

      {sugestoes && (
        <div className="mt-3 border-t border-linha pt-3">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Sugestões</h3>
            <button type="button" className="text-xs text-lapis hover:text-grafite" onClick={() => setSugestoes(null)}>
              Fechar
            </button>
          </div>
          {sugestoes.length === 0 ? (
            <Vazio>Nada atrasado nem com prazo perto. Dia livre para o que você escolher.</Vazio>
          ) : (
            <ul className="divide-y divide-linha">
              {sugestoes.map(({ tarefa, motivo }) => (
                <li key={tarefa.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{tarefa.title}</span>
                  <span className="text-xs text-lapis">{motivo}</span>
                  <Botao
                    tamanho="p"
                    onClick={async () => {
                      const ok = await puxarParaHoje(tarefa.id);
                      if (!ok) return avisar("O dia já tem 5 tarefas");
                      setSugestoes((s) => s?.filter((x) => x.tarefa.id !== tarefa.id) ?? null);
                    }}
                  >
                    Trazer
                  </Botao>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Painel>
  );
}
