/* Caixa de ideias: campo sempre aberto + a lista do que ainda não
   foi decidido. Cada ideia vira tarefa, vai para um projeto ou é
   descartada. Usada na Hoje e no passo 3 da Revisão semanal. */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, FolderInput, Trash2 } from "lucide-react";
import { db } from "../../db/db";
import { criarIdeia, descartarIdeia, ideiaParaProjeto, ideiaParaTarefa } from "../../db/acoes";
import { useToast } from "../../ui/Toast";
import { Vazio } from "../../ui/ui";

export function CaixaIdeias({ semCampo }: { semCampo?: boolean }) {
  const ideias = useLiveQuery(() => db.ideas.where("status").equals("inbox").sortBy("createdAt"), []) ?? [];
  const projetos = useLiveQuery(() => db.projects.where("status").equals("ativo").toArray(), []) ?? [];
  const [texto, setTexto] = useState("");
  const avisar = useToast();

  return (
    <div>
      {!semCampo && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!texto.trim()) return;
            const desfazer = await criarIdeia(texto);
            setTexto("");
            avisar("Ideia guardada", desfazer);
          }}
        >
          <label htmlFor="nova-ideia" className="sr-only">
            Nova ideia
          </label>
          <input
            id="nova-ideia"
            className="campo"
            placeholder="Teve uma ideia? Escreva e aperte Enter"
            value={texto}
            maxLength={280}
            onChange={(e) => setTexto(e.target.value)}
          />
        </form>
      )}

      {ideias.length === 0 ? (
        <Vazio>{semCampo ? "Caixa vazia. Nada para decidir." : "Nenhuma ideia na caixa."}</Vazio>
      ) : (
        <ul className="mt-2 divide-y divide-linha">
          {ideias.map((ideia) => (
            <li key={ideia.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="min-w-0 flex-1 text-sm break-words">{ideia.text}</span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  title="Virar tarefa de hoje"
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-lapis hover:bg-papel hover:text-grafite"
                  onClick={async () => {
                    const r = await ideiaParaTarefa(ideia.id);
                    avisar(r?.cabeHoje === false ? "Virou tarefa (o dia já está cheio)" : "Virou tarefa de hoje");
                  }}
                >
                  <ArrowRight size={14} aria-hidden="true" /> Tarefa
                </button>
                {projetos.length > 0 && (
                  <label className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-lapis hover:bg-papel hover:text-grafite">
                    <FolderInput size={14} aria-hidden="true" />
                    <span className="sr-only">Mover para o projeto</span>
                    <select
                      className="max-w-28 cursor-pointer bg-transparent"
                      value=""
                      onChange={async (e) => {
                        if (!e.target.value) return;
                        await ideiaParaProjeto(ideia.id, e.target.value);
                        avisar("Ideia movida para o projeto");
                      }}
                    >
                      <option value="">Projeto…</option>
                      {projetos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <button
                  type="button"
                  title="Descartar"
                  aria-label={`Descartar ideia: ${ideia.text}`}
                  className="rounded-lg p-1.5 text-lapis hover:bg-papel hover:text-grafite"
                  onClick={async () => avisar("Ideia descartada", await descartarIdeia(ideia.id))}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
