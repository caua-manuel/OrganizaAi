/* Lista de lançamentos do mês, com filtros e troca de categoria na
   própria linha. Ao corrigir uma categoria, o app oferece criar uma
   regra ("Sempre classificar 'IFOOD' como Comer fora?"). */
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { apagarLancamento, atualizarLancamento, mudarCategoria } from "../../db/acoes";
import { ORIGENS, nomeOrigem } from "../../db/types";
import type { Category, Transaction } from "../../db/types";
import { dentro, fmtData, limitesDoMes } from "../../lib/datas";
import { formatarReais, lerReais } from "../../lib/dinheiro";
import { palavraChave } from "../../lib/financas";
import { useToast } from "../../ui/Toast";
import { Botao, Painel, Vazio } from "../../ui/ui";
import { SugestaoRegra } from "./SugestaoRegra";
import type { DadosFinancas } from "./useFinancas";

export function Lancamentos({ f, mes }: { f: DadosFinancas; mes: string }) {
  const avisar = useToast();
  const [cat, setCat] = useState("");
  const [origem, setOrigem] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [sugestao, setSugestao] = useState<{ palavra: string; categoria: Category } | null>(null);

  const lim = limitesDoMes(mes);
  const lista = f.txs.filter(
    (t) => dentro(t.date, lim) && (!cat || t.categoryId === cat) && (!origem || t.source === origem),
  );
  const ordenadas = [...f.cats].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));

  async function trocar(t: Transaction, categoryId: string) {
    await mudarCategoria(t.id, categoryId);
    const categoria = f.catPorId.get(categoryId);
    if (categoria && categoria.name !== "Sem categoria") setSugestao({ palavra: palavraChave(t.description), categoria });
  }

  return (
    <Painel titulo="Lançamentos" pilar="financas">
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="filtro-cat">
          Categoria
        </label>
        <select id="filtro-cat" className="campo w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Todas as categorias</option>
          {ordenadas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="filtro-origem">
          Origem
        </label>
        <select id="filtro-origem" className="campo w-auto" value={origem} onChange={(e) => setOrigem(e.target.value)}>
          <option value="">Todas as origens</option>
          {ORIGENS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
      </div>

      {sugestao && <SugestaoRegra key={sugestao.palavra + sugestao.categoria.id} {...sugestao} onFechar={() => setSugestao(null)} />}

      {lista.length === 0 ? (
        <Vazio>Nenhum lançamento aqui. Registre um gasto com + ou importe um extrato.</Vazio>
      ) : (
        <ul className="divide-y divide-linha">
          {lista.map((t) => {
            const c = f.catPorId.get(t.categoryId);
            if (editando === t.id) return <EdicaoLancamento key={t.id} t={t} onFechar={() => setEditando(null)} />;
            return (
              <li key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 py-2 sm:grid-cols-[5.5rem_1fr_11rem_7rem_auto]">
                <span className="text-xs text-lapis sm:text-sm">{fmtData(t.date, "dd/MM")}</span>
                <span className="col-span-2 min-w-0 truncate text-sm sm:col-span-1" title={t.description}>
                  {t.description}
                  {t.source && <span className="text-lapis"> · {nomeOrigem(t.source)}</span>}
                  {t.origin === "import" && <span className="text-lapis"> · extrato</span>}
                </span>
                <select
                  aria-label={`Categoria de ${t.description}`}
                  className="campo py-1 text-sm"
                  style={{ borderLeft: `4px solid ${c?.color ?? "var(--cor-linha)"}` }}
                  value={t.categoryId}
                  onChange={(e) => trocar(t, e.target.value)}
                >
                  {ordenadas
                    .filter((x) => x.type === (t.amount < 0 ? "saida" : "entrada"))
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </select>
                <span className={`num text-right text-sm ${t.amount > 0 ? "font-semibold" : ""}`}>
                  {formatarReais(t.amount)}
                </span>
                <span className="flex justify-self-end">
                  <button
                    type="button"
                    aria-label={`Editar ${t.description}`}
                    className="rounded-lg p-1.5 text-lapis hover:bg-papel hover:text-grafite"
                    onClick={() => setEditando(t.id)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Apagar ${t.description}`}
                    className="rounded-lg p-1.5 text-lapis hover:bg-papel hover:text-grafite"
                    onClick={async () => avisar("Lançamento apagado", await apagarLancamento(t.id))}
                  >
                    <Trash2 size={14} />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Painel>
  );
}

/* Edição na própria linha: data, descrição e valor. O sinal é
   mantido — uma saída continua saída, uma entrada continua entrada. */
function EdicaoLancamento({ t, onFechar }: { t: Transaction; onFechar: () => void }) {
  const [data, setData] = useState(t.date);
  const [descricao, setDescricao] = useState(t.description);
  const [valor, setValor] = useState((Math.abs(t.amount) / 100).toFixed(2).replace(".", ","));
  const centavos = lerReais(valor);
  const valido = !!data && !!descricao.trim() && centavos != null && centavos > 0;
  return (
    <li className="py-2">
      <form
        className="grid gap-2 sm:grid-cols-[8.5rem_1fr_7rem_auto]"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valido) return;
          await atualizarLancamento(t.id, { date: data, description: descricao.trim(), amount: Math.sign(t.amount) * centavos! });
          onFechar();
        }}
        onKeyDown={(e) => e.key === "Escape" && onFechar()}
      >
        <input aria-label="Data" type="date" className="campo py-1 text-sm" value={data} onChange={(e) => setData(e.target.value)} />
        <input aria-label="Descrição" autoFocus className="campo py-1 text-sm" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <input aria-label="Valor" inputMode="decimal" className="campo num py-1 text-sm" value={valor} onChange={(e) => setValor(e.target.value)} />
        <span className="flex gap-1">
          <Botao type="submit" tamanho="p" variante="primario" disabled={!valido}>
            Salvar
          </Botao>
          <Botao tamanho="p" variante="fantasma" onClick={onFechar}>
            Cancelar
          </Botao>
        </span>
      </form>
    </li>
  );
}
