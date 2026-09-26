/* Página de um projeto: próximo passo, descrição, tarefas, ideias que
   vieram da caixa e histórico de sessões de foco. */
import { useState } from "react";
import { Link, useParams } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { db } from "../../db/db";
import { alternarTarefa, atualizarProjeto, criarTarefa, puxarParaHoje, registrarFoco } from "../../db/acoes";
import type { Project } from "../../db/types";
import { fmtData, hojeISO } from "../../lib/datas";
import { useToast } from "../../ui/Toast";
import { Botao, Cabecalho, Painel, Vazio } from "../../ui/ui";
import { STATUS } from "./Projetos";

const ROSA = "var(--pilar-projetos)";

export function ProjetoDetalhe() {
  const { id = "" } = useParams();
  const avisar = useToast();
  const dados = useLiveQuery(async () => {
    const [projeto, tarefas, ideias, sessoes] = await Promise.all([
      db.projects.get(id),
      db.tasks.where("projectId").equals(id).sortBy("createdAt"),
      db.ideas.filter((i) => i.movedTo?.type === "project" && i.movedTo.id === id).toArray(),
      db.focusSessions.where("projectId").equals(id).reverse().sortBy("date"),
    ]);
    return { projeto, tarefas, ideias, sessoes };
  }, [id]);
  const [nova, setNova] = useState("");

  if (!dados) return null;
  const { projeto, tarefas, ideias, sessoes } = dados;
  if (!projeto)
    return (
      <Painel>
        <Vazio>Projeto não encontrado.</Vazio>
        <Link to="/projetos" className="text-sm underline">
          Voltar para Projetos
        </Link>
      </Painel>
    );

  const total = sessoes.reduce((t, s) => t + s.minutes, 0);
  const abertas = tarefas.filter((t) => !t.doneAt);
  const feitas = tarefas.filter((t) => t.doneAt);

  return (
    <>
      <Cabecalho
        titulo={projeto.name}
        sub={`${Math.floor(total / 60)} h ${total % 60} min de foco no total`}
        acoes={
          <>
            <Link to="/projetos" className="inline-flex items-center gap-1 self-center text-sm text-lapis hover:text-grafite">
              <ArrowLeft size={16} aria-hidden="true" /> Projetos
            </Link>
            <select
              aria-label="Status do projeto"
              className="campo w-auto"
              value={projeto.status}
              onChange={(e) => atualizarProjeto(projeto.id, { status: e.target.value as Project["status"] })}
            >
              {(Object.keys(STATUS) as Project["status"][]).map((s) => (
                <option key={s} value={s}>
                  {STATUS[s]}
                </option>
              ))}
            </select>
          </>
        }
      />

      <div className="grid gap-4">
        <Painel pilar="projetos">
          <label className="rotulo" htmlFor="proximo-passo">
            Próximo passo
          </label>
          <input
            id="proximo-passo"
            className="campo text-base font-medium"
            placeholder="Qual a menor ação que move este projeto?"
            key={projeto.nextStep ?? ""}
            defaultValue={projeto.nextStep ?? ""}
            onBlur={(e) => e.target.value !== (projeto.nextStep ?? "") && atualizarProjeto(projeto.id, { nextStep: e.target.value.trim() || undefined })}
          />
          <label className="rotulo mt-3" htmlFor="descricao">
            Descrição
          </label>
          <textarea
            id="descricao"
            rows={3}
            className="campo"
            placeholder="Do que se trata, qual o objetivo…"
            key={projeto.description ?? ""}
            defaultValue={projeto.description ?? ""}
            onBlur={(e) => e.target.value !== (projeto.description ?? "") && atualizarProjeto(projeto.id, { description: e.target.value.trim() || undefined })}
          />
        </Painel>

        <div className="grid gap-4 md:grid-cols-2">
          <Painel titulo="Tarefas" pilar="projetos">
            <form
              className="mb-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!nova.trim()) return;
                await criarTarefa({ title: nova, pillar: "projetos", projectId: projeto.id });
                setNova("");
              }}
            >
              <input aria-label="Nova tarefa do projeto" className="campo" placeholder="Nova tarefa e Enter" value={nova} maxLength={80} onChange={(e) => setNova(e.target.value)} />
            </form>
            {abertas.length === 0 ? (
              <Vazio>Nenhuma tarefa aberta.</Vazio>
            ) : (
              <ul className="divide-y divide-linha">
                {abertas.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      aria-label={`Concluir ${t.title}`}
                      className="size-4 cursor-pointer"
                      style={{ accentColor: ROSA }}
                      checked={false}
                      onChange={() => alternarTarefa(t.id)}
                    />
                    <span className="flex-1 truncate">{t.title}</span>
                    {t.plannedFor === hojeISO() ? (
                      <span className="text-xs text-lapis">hoje</span>
                    ) : (
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
                  </li>
                ))}
              </ul>
            )}
            {feitas.length > 0 && <p className="mt-2 text-xs text-lapis">{feitas.length} concluídas</p>}
          </Painel>

          <Painel titulo="Ideias deste projeto" pilar="projetos">
            {ideias.length === 0 ? (
              <Vazio>Ideias movidas da caixa de ideias aparecem aqui.</Vazio>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {ideias.map((i) => (
                  <li key={i.id}>
                    {i.text} <span className="text-xs text-lapis">· {fmtData(i.createdAt.slice(0, 10))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Painel>
        </div>

        <Painel
          titulo="Sessões de foco"
          pilar="projetos"
          acao={
            <div className="flex gap-1">
              {[30, 60, 90].map((m) => (
                <Botao
                  key={m}
                  tamanho="p"
                  onClick={async () => avisar(`${m} min em ${projeto.name}`, await registrarFoco("projetos", m, projeto.id))}
                >
                  +{m} min
                </Botao>
              ))}
            </div>
          }
        >
          {sessoes.length === 0 ? (
            <Vazio>Nenhuma sessão ainda.</Vazio>
          ) : (
            <ul className="divide-y divide-linha text-sm">
              {sessoes.slice(0, 12).map((s) => (
                <li key={s.id} className="flex justify-between py-1.5">
                  <span className="text-lapis first-letter:uppercase">{fmtData(s.date, "EEE, d 'de' MMM")}</span>
                  <span className="num">{s.minutes} min</span>
                </li>
              ))}
            </ul>
          )}
        </Painel>
      </div>
    </>
  );
}
