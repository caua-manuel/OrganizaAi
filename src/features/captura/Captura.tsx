/* Captura rápida: o coração do app. Abre pelo "+" ou pelas teclas
   N / Ctrl+K. Cada tipo é um formulário mínimo que salva com Enter.
   Meta: qualquer registro em até 3 toques e 10 segundos. */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowDownCircle, ArrowUpCircle, CheckSquare, Dumbbell, Lightbulb, X } from "lucide-react";
import { FormTreino } from "./FormTreino";
import { FormEntrada, FormGasto } from "./FormsFinancas";
import type { LucideIcon } from "lucide-react";
import { criarIdeia, criarTarefa } from "../../db/acoes";
import { PILARES } from "../../db/types";
import type { Pillar } from "../../db/types";
import { hojeISO } from "../../lib/datas";
import { useToast } from "../../ui/Toast";
import { Botao, Chip, corPilar } from "../../ui/ui";

export type TipoCaptura = "gasto" | "entrada" | "ideia" | "tarefa" | "treino";

interface Opcao {
  tipo: TipoCaptura;
  nome: string;
  Icone: LucideIcon;
  cor: string;
}

const OPCOES: Opcao[] = [
  { tipo: "gasto", nome: "Gasto", Icone: ArrowDownCircle, cor: "var(--pilar-financas)" },
  { tipo: "entrada", nome: "Entrada", Icone: ArrowUpCircle, cor: "var(--pilar-financas)" },
  { tipo: "ideia", nome: "Ideia", Icone: Lightbulb, cor: "var(--pilar-saude)" },
  { tipo: "tarefa", nome: "Tarefa", Icone: CheckSquare, cor: "var(--pilar-trabalho)" },
  { tipo: "treino", nome: "Treino", Icone: Dumbbell, cor: "var(--pilar-saude)" },
];

export function Captura({ aberta, onFechar }: { aberta: boolean; onFechar: () => void }) {
  const [tipo, setTipo] = useState<TipoCaptura | null>(null);

  useEffect(() => {
    if (!aberta) setTipo(null);
  }, [aberta]);

  /* Esc volta um passo (ou fecha); números escolhem o tipo */
  useEffect(() => {
    if (!aberta) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (tipo) setTipo(null);
        else onFechar();
        return;
      }
      const alvo = e.target as HTMLElement;
      if (!tipo && !["INPUT", "TEXTAREA"].includes(alvo.tagName)) {
        const n = Number(e.key);
        if (n >= 1 && n <= OPCOES.length) {
          e.preventDefault();
          setTipo(OPCOES[n - 1].tipo);
        }
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberta, tipo, onFechar]);

  if (!aberta) return null;
  const atual = OPCOES.find((o) => o.tipo === tipo);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-start sm:pt-[12vh]">
      <button type="button" aria-label="Fechar" tabIndex={-1} className="absolute inset-0 bg-black/35" onClick={onFechar} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={atual ? `Registrar ${atual.nome.toLowerCase()}` : "Captura rápida"}
        className="relative w-full max-w-md rounded-t-2xl bg-folha p-4 pb-8 shadow-2xl sm:rounded-2xl sm:pb-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">
            {atual ? (
              <button type="button" className="text-lapis hover:text-grafite" onClick={() => setTipo(null)}>
                Capturar <span aria-hidden="true">›</span> <span className="text-grafite">{atual.nome}</span>
              </button>
            ) : (
              "O que você quer registrar?"
            )}
          </h2>
          <button type="button" aria-label="Fechar" onClick={onFechar} className="p-1 text-lapis hover:text-grafite">
            <X size={20} />
          </button>
        </div>

        {!tipo && (
          <div className="grid grid-cols-3 gap-2">
            {OPCOES.map((o, i) => (
              <button
                key={o.tipo}
                type="button"
                autoFocus={i === 0}
                onClick={() => setTipo(o.tipo)}
                className="relative flex flex-col items-center gap-1.5 rounded-xl border border-linha px-2 py-3.5 text-sm font-medium hover:bg-papel"
              >
                <o.Icone size={22} style={{ color: o.cor }} aria-hidden="true" />
                {o.nome}
                <kbd className="absolute top-1.5 right-2 hidden text-[0.6875rem] text-lapis sm:block">{i + 1}</kbd>
              </button>
            ))}
          </div>
        )}

        {tipo === "gasto" && <FormGasto onPronto={onFechar} />}
        {tipo === "entrada" && <FormEntrada onPronto={onFechar} />}
        {tipo === "ideia" && <FormIdeia onPronto={onFechar} />}
        {tipo === "tarefa" && <FormTarefa onPronto={onFechar} />}
        {tipo === "treino" && <FormTreino onPronto={onFechar} />}
      </div>
    </div>
  );
}

/* ── pedaços comuns ─────────────────────────────────────── */

export function Rodape({ children, desabilitado }: { children?: ReactNode; desabilitado?: boolean }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      <span className="text-xs text-lapis">{children ?? "Enter salva · Esc volta"}</span>
      <Botao type="submit" variante="primario" disabled={desabilitado}>
        Salvar
      </Botao>
    </div>
  );
}

/* ── Ideia: só um campo ─────────────────────────────────── */
function FormIdeia({ onPronto }: { onPronto: () => void }) {
  const [texto, setTexto] = useState("");
  const avisar = useToast();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!texto.trim()) return;
        const desfazer = await criarIdeia(texto);
        avisar("Ideia guardada na caixa", desfazer);
        onPronto();
      }}
    >
      <label className="sr-only" htmlFor="cap-ideia">
        Ideia
      </label>
      <input
        id="cap-ideia"
        autoFocus
        className="campo"
        placeholder="Anote a ideia…"
        value={texto}
        maxLength={280}
        onChange={(e) => setTexto(e.target.value)}
      />
      <Rodape desabilitado={!texto.trim()} />
    </form>
  );
}

/* ── Tarefa: texto + pilar + "para hoje?" ───────────────── */
function FormTarefa({ onPronto }: { onPronto: () => void }) {
  const [texto, setTexto] = useState("");
  const [pilar, setPilar] = useState<Pillar | null>(null);
  const [hoje, setHoje] = useState(true);
  const avisar = useToast();
  const campo = useRef<HTMLInputElement>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!texto.trim()) return;
        const { cabeHoje, desfazer } = await criarTarefa({
          title: texto,
          pillar: pilar,
          plannedFor: hoje ? hojeISO() : undefined,
          kind: pilar === "trabalho" ? "novo" : undefined,
        });
        avisar(
          hoje && !cabeHoje ? "O dia já tem 5 tarefas; esta ficou para depois" : hoje ? "Tarefa para hoje" : "Tarefa guardada",
          desfazer,
        );
        onPronto();
      }}
    >
      <label className="sr-only" htmlFor="cap-tarefa">
        Tarefa
      </label>
      <input
        id="cap-tarefa"
        ref={campo}
        autoFocus
        className="campo"
        placeholder="O que precisa ser feito?"
        value={texto}
        maxLength={80}
        onChange={(e) => setTexto(e.target.value)}
      />
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Pilar">
        {PILARES.map((p) => (
          <Chip key={p.id} ativo={pilar === p.id} cor={corPilar(p.id)} onClick={() => setPilar(pilar === p.id ? null : p.id)}>
            {p.nome}
          </Chip>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={hoje} onChange={(e) => setHoje(e.target.checked)} className="size-4 accent-current" />
        Para hoje
      </label>
      <Rodape desabilitado={!texto.trim()} />
    </form>
  );
}
