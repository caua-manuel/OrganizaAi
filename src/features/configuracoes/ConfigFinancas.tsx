/* Configurações de finanças. Os campos salvam ao sair deles (blur),
   então não existe botão "salvar" para esquecer de apertar.
   Estas telas de cadastro gravam direto nas tabelas. */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { db } from "../../db/db";
import { apagarCategoria, CATEGORIAS_SISTEMA, criarRegra, moverRegra } from "../../db/acoes";
import { ordenarRegras } from "../../lib/financas";
import { useToast } from "../../ui/Toast";
import { salvarSettings, useCategorias, useSettings } from "../../db/hooks";
import type { Category, SavingsGoal } from "../../db/types";
import { agora, comBase } from "../../lib/id";
import { lerReais } from "../../lib/dinheiro";
import { Botao, Painel, Vazio } from "../../ui/ui";

const paraCampo = (c?: number) => (c ? (c / 100).toFixed(2).replace(".", ",") : "");

function CampoReais({ id, rotulo, valor, onSalvar }: { id: string; rotulo: string; valor?: number; onSalvar: (c: number) => void }) {
  return (
    <div>
      <label className="rotulo" htmlFor={id}>
        {rotulo}
      </label>
      <input
        id={id}
        key={valor}
        inputMode="decimal"
        className="campo num"
        placeholder="R$ 0,00"
        defaultValue={paraCampo(valor)}
        onBlur={(e) => {
          const c = e.target.value.trim() ? lerReais(e.target.value) : 0;
          if (c != null && c !== (valor ?? 0)) onSalvar(Math.max(0, c));
        }}
      />
    </div>
  );
}

const atualizarMeta = (id: string, m: Partial<SavingsGoal>) => db.savingsGoals.update(id, { ...m, updatedAt: agora() });
const atualizarCategoria = (id: string, m: Partial<Category>) => db.categories.update(id, { ...m, updatedAt: agora() });

export function ConfigPoupanca() {
  const settings = useSettings();
  const metas = useLiveQuery(() => db.savingsGoals.toArray().then((ms) => ms.sort((a, b) => a.createdAt.localeCompare(b.createdAt))), []) ?? [];
  return (
    <Painel titulo="Poupança" pilar="financas" id="poupanca">
      <div className="grid gap-5">
        {metas.map((m) => (
          <fieldset key={m.id} className="grid gap-3 sm:grid-cols-3">
            <legend className="mb-2 text-sm font-semibold">{m.name}</legend>
            <CampoReais
              id={`alvo-${m.id}`}
              rotulo={m.autoTarget ? "Valor manual (até ter 3 meses de dados)" : "Valor da meta"}
              valor={m.targetAmount}
              onSalvar={(c) => atualizarMeta(m.id, { targetAmount: c })}
            />
            <div>
              <label className="rotulo" htmlFor={`prazo-${m.id}`}>
                Data desejada (opcional)
              </label>
              <input
                id={`prazo-${m.id}`}
                type="date"
                className="campo"
                value={m.deadline ?? ""}
                onChange={(e) => atualizarMeta(m.id, { deadline: e.target.value || undefined })}
              />
            </div>
            {m.name.toLowerCase().includes("reserva") && (
              <div>
                <label className="rotulo" htmlFor={`auto-${m.id}`}>
                  Calcular como N × gasto médio mensal
                </label>
                <select
                  id={`auto-${m.id}`}
                  className="campo"
                  value={m.autoTarget?.monthsOfExpenses ?? 0}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    atualizarMeta(m.id, { autoTarget: n ? { monthsOfExpenses: n } : undefined });
                  }}
                >
                  <option value={0}>Não, usar valor manual</option>
                  {[3, 4, 6, 9, 12].map((n) => (
                    <option key={n} value={n}>
                      {n} meses de gastos
                    </option>
                  ))}
                </select>
              </div>
            )}
          </fieldset>
        ))}

        <div className="grid gap-3 border-t border-linha pt-4 sm:grid-cols-3">
          <CampoReais
            id="base-mensal"
            rotulo="Meta mensal de guardar (base)"
            valor={settings.monthlySavingsBase}
            onSalvar={(c) => salvarSettings({ monthlySavingsBase: c })}
          />
          <label className="mt-6 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.voipGoesToSavings}
              onChange={(e) => salvarSettings({ voipGoesToSavings: e.target.checked })}
            />
            Dinheiro do VoIP vai para a poupança
          </label>
          {settings.voipGoesToSavings && (
            <div>
              <label className="rotulo" htmlFor="voip-meta">
                Meta que recebe o VoIP
              </label>
              <select
                id="voip-meta"
                className="campo"
                value={settings.voipGoalId ?? ""}
                onChange={(e) => salvarSettings({ voipGoalId: e.target.value || undefined })}
              >
                {metas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </Painel>
  );
}

export function ConfigCategorias() {
  const cats = useCategorias();
  const [nova, setNova] = useState("");
  const [tipo, setTipo] = useState<Category["type"]>("saida");
  const avisar = useToast();
  return (
    <Painel titulo="Categorias" pilar="financas">
      {(["saida", "entrada"] as const).map((t) => (
        <div key={t} className="mb-4">
          <h3 className="mb-2 text-sm font-semibold">{t === "saida" ? "Saídas" : "Entradas"}</h3>
          <ul className="grid gap-2">
            {cats
              .filter((c) => c.type === t)
              .map((c) => (
                <li key={c.id} className="grid grid-cols-[2.25rem_1fr_auto_2rem] items-center gap-2 sm:grid-cols-[2.25rem_1fr_9rem_2rem]">
                  <input
                    type="color"
                    aria-label={`Cor de ${c.name}`}
                    className="h-9 w-9 cursor-pointer rounded-lg border border-linha bg-transparent p-0.5"
                    value={c.color}
                    onChange={(e) => atualizarCategoria(c.id, { color: e.target.value })}
                  />
                  <input
                    aria-label="Nome da categoria"
                    className="campo"
                    defaultValue={c.name}
                    key={c.name}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && atualizarCategoria(c.id, { name: e.target.value.trim() })}
                  />
                  {t === "saida" ? (
                    <input
                      aria-label={`Limite semanal de ${c.name}`}
                      inputMode="decimal"
                      className="campo num"
                      placeholder="Limite/semana"
                      key={c.weeklyLimit}
                      defaultValue={paraCampo(c.weeklyLimit)}
                      onBlur={(e) => {
                        const v = e.target.value.trim() ? lerReais(e.target.value) : 0;
                        if (v != null) atualizarCategoria(c.id, { weeklyLimit: v || undefined });
                      }}
                    />
                  ) : (
                    <span />
                  )}
                  {CATEGORIAS_SISTEMA.includes(c.name) ? (
                    <span title="Categoria padrão do app: não pode ser apagada" />
                  ) : (
                    <button
                      type="button"
                      aria-label={`Apagar categoria ${c.name}`}
                      className="rounded-lg p-1.5 text-lapis hover:bg-papel hover:text-grafite"
                      onClick={async () => {
                        const destino = t === "saida" ? "Sem categoria" : "Outras entradas";
                        if (!window.confirm(`Apagar "${c.name}"? Os lançamentos dela vão para "${destino}" e as regras dela serão apagadas.`)) return;
                        const n = await apagarCategoria(c.id);
                        avisar(n ? `Categoria apagada · ${n} lançamentos foram para "${destino}"` : "Categoria apagada");
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
          </ul>
        </div>
      ))}
      <form
        className="flex flex-wrap gap-2 border-t border-linha pt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!nova.trim()) return;
          await db.categories.add(comBase({ name: nova.trim(), type: tipo, color: "#6B7385" }));
          setNova("");
        }}
      >
        <input aria-label="Nova categoria" className="campo max-w-56" placeholder="Nova categoria" value={nova} onChange={(e) => setNova(e.target.value)} />
        <select aria-label="Tipo" className="campo w-auto" value={tipo} onChange={(e) => setTipo(e.target.value as Category["type"])}>
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
        </select>
        <Botao type="submit">Adicionar</Botao>
      </form>
    </Painel>
  );
}

export function ConfigRegras() {
  const regras = useLiveQuery(() => db.categoryRules.orderBy("id").toArray(), []) ?? [];
  const cats = useCategorias();
  const [texto, setTexto] = useState("");
  const [cat, setCat] = useState("");
  const ordenadas = ordenarRegras(regras);
  return (
    <Painel titulo="Regras de categorização" pilar="financas">
      <p className="mb-3 text-sm text-lapis">
        Se a descrição do lançamento contém o texto, ele vai para a categoria. Vale a primeira regra da lista que bater: use as setas para mudar a ordem.
      </p>
      {ordenadas.length === 0 ? (
        <Vazio>Nenhuma regra ainda.</Vazio>
      ) : (
        <ul className="mb-3 divide-y divide-linha">
          {ordenadas.map((r, i) => (
            <li key={r.id} className="flex items-center gap-2 py-1.5 text-sm">
              <span className="flex flex-col">
                <button
                  type="button"
                  aria-label={`Subir prioridade de ${r.contains}`}
                  disabled={i === 0}
                  className="rounded p-0.5 text-lapis hover:text-grafite disabled:opacity-30"
                  onClick={() => moverRegra(r.id, -1)}
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  aria-label={`Descer prioridade de ${r.contains}`}
                  disabled={i === ordenadas.length - 1}
                  className="rounded p-0.5 text-lapis hover:text-grafite disabled:opacity-30"
                  onClick={() => moverRegra(r.id, 1)}
                >
                  <ChevronDown size={14} />
                </button>
              </span>
              <code className="min-w-24 rounded bg-papel px-1.5 py-0.5">{r.contains}</code>
              <span className="text-lapis">→</span>
              <select
                aria-label={`Categoria da regra ${r.contains}`}
                className="campo w-auto flex-1 py-1"
                value={r.categoryId}
                onChange={(e) => db.categoryRules.update(r.id, { categoryId: e.target.value, updatedAt: agora() })}
              >
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label={`Apagar regra ${r.contains}`}
                className="rounded-lg p-1.5 text-lapis hover:bg-papel hover:text-grafite"
                onClick={() => db.categoryRules.delete(r.id)}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex flex-wrap gap-2 border-t border-linha pt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!texto.trim() || !cat) return;
          await criarRegra(texto, cat);
          setTexto("");
        }}
      >
        <input aria-label="Texto da regra" className="campo max-w-44" placeholder="Ex.: IFOOD" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <select aria-label="Categoria" className="campo w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Categoria…</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Botao type="submit">Adicionar regra</Botao>
      </form>
    </Painel>
  );
}

export function ConfigBancos() {
  const mapas = useLiveQuery(() => db.importMappings.toArray(), []) ?? [];
  return (
    <Painel titulo="Formatos de extrato salvos" pilar="financas">
      {mapas.length === 0 ? (
        <Vazio>Nenhum ainda. Eles são salvos na primeira importação de cada banco.</Vazio>
      ) : (
        <ul className="divide-y divide-linha text-sm">
          {mapas.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 py-2">
              <span>
                <strong>{m.bankName}</strong>{" "}
                <span className="text-lapis">
                  · {m.dateColumn} / {m.amountColumn} / {m.descriptionColumn} · {m.dateFormat}
                  {m.invertSign && " · sinal invertido"}
                </span>
              </span>
              <button
                type="button"
                aria-label={`Apagar formato de ${m.bankName}`}
                className="rounded-lg p-1.5 text-lapis hover:bg-papel hover:text-grafite"
                onClick={() => db.importMappings.delete(m.id)}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Painel>
  );
}
