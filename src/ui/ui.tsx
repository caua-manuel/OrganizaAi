/* Componentes base, reaproveitados em todas as telas.
   Raio com hierarquia: painel 16px > botão 10px > chip 8px. */
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import type { Pillar } from "../db/types";

export const corPilar = (p?: Pillar | null) => (p ? `var(--pilar-${p})` : undefined);

const junta = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");

/* ── Cabeçalho de página ─────────────────────────────────── */
export function Cabecalho({ titulo, sub, acoes }: { titulo: string; sub?: ReactNode; acoes?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[1.75rem] font-semibold">{titulo}</h1>
        {sub && <p className="mt-1 text-sm text-lapis">{sub}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </header>
  );
}

/* ── Painel ───────────────────────────────────────────────
   O pilar aparece como uma aba colorida na lateral esquerda, não
   como um card inteiro colorido. */
export function Painel({
  titulo,
  pilar,
  cor,
  acao,
  children,
  className,
  id,
}: {
  titulo?: ReactNode;
  pilar?: Pillar | null;
  cor?: string;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const aba = cor ?? corPilar(pilar);
  return (
    <section id={id} className={junta("relative rounded-2xl border border-linha bg-folha p-4 sm:p-5", className)}>
      {aba && (
        <span
          aria-hidden="true"
          className="absolute top-4 bottom-4 -left-px w-1 rounded-r-full"
          style={{ background: aba }}
        />
      )}
      {(titulo || acao) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {titulo && <h2 className="text-base font-semibold">{titulo}</h2>}
          {acao}
        </div>
      )}
      {children}
    </section>
  );
}

/* ── Botão ─────────────────────────────────────────────── */
type BotaoProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "sutil" | "fantasma" | "perigo";
  tamanho?: "p" | "m";
};

export function Botao({ variante = "sutil", tamanho = "m", className, type = "button", ...resto }: BotaoProps) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-[10px] font-medium transition-colors disabled:opacity-50";
  const tam = tamanho === "p" ? "px-2.5 py-1 text-[0.8125rem]" : "px-3.5 py-2 text-sm";
  const cores = {
    primario: "bg-grafite text-papel hover:opacity-90",
    sutil: "border border-linha bg-folha text-grafite hover:bg-papel",
    fantasma: "text-lapis hover:bg-papel hover:text-grafite",
    perigo: "border border-linha bg-folha text-[#C2410C] hover:bg-papel",
  }[variante];
  return <button type={type} className={junta(base, tam, cores, className)} {...resto} />;
}

/* ── Chip ──────────────────────────────────────────────────
   Botão pequeno de escolha. Quando ativo, vira marca-texto na cor
   passada. */
export function Chip({
  ativo,
  cor,
  className,
  type = "button",
  style,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { ativo?: boolean; cor?: string }) {
  return (
    <button
      type={type}
      aria-pressed={ativo}
      className={junta(
        "rounded-lg border px-2.5 py-1 text-[0.8125rem] font-medium transition-colors",
        ativo ? "marca border-transparent" : "border-linha text-lapis hover:text-grafite",
        className,
      )}
      style={{ ...(cor ? ({ "--marca": cor } as CSSProperties) : {}), ...style }}
      {...resto}
    />
  );
}

/* ── Etiqueta (marca-texto, não clicável) ─────────────────── */
export function Etiqueta({ cor, children }: { cor?: string; children: ReactNode }) {
  return (
    <span className="marca inline-block rounded-md px-1.5 py-0.5 text-xs font-medium" style={{ "--marca": cor } as CSSProperties}>
      {children}
    </span>
  );
}

/* ── Barra de progresso ─────────────────────────────────────
   A barra para em 100%, mas o texto mostra o valor real (ex.: 5/3).
   Passar da meta é bom, não é erro. */
export function Barra({
  valor,
  meta,
  cor = "var(--cor-grafite)",
  altura = 8,
  rotulo,
}: {
  valor: number;
  meta: number;
  cor?: string;
  altura?: number;
  rotulo?: string;
}) {
  const pct = meta > 0 ? Math.min(100, Math.max(0, (valor / meta) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={rotulo}
      className="w-full overflow-hidden rounded-full"
      style={{ height: altura, background: "var(--cor-linha)" }}
    >
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: cor }} />
    </div>
  );
}

/* ── Estado vazio: diz o que fazer, sem culpa ─────────────── */
export function Vazio({ children }: { children: ReactNode }) {
  return <p className="py-3 text-sm text-lapis">{children}</p>;
}

/* ── Linha de indicador: "Academia  2/3" com barra ────────── */
export function Indicador({
  nome,
  texto,
  valor,
  meta,
  cor,
}: {
  nome: string;
  texto: string;
  valor: number;
  meta: number;
  cor?: string;
}) {
  const bateu = meta > 0 && valor >= meta;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span>{nome}</span>
        <span className={junta("num", bateu ? "font-semibold" : "text-lapis")}>
          {texto}
          {bateu && <span aria-label="meta batida"> ✓</span>}
        </span>
      </div>
      <Barra valor={valor} meta={meta} cor={cor} altura={6} rotulo={nome} />
    </div>
  );
}

export { junta };
