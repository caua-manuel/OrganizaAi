/* Janela sobre a tela (no celular, sobe de baixo). Prende o foco do
   teclado dentro dela enquanto aberta, fecha com Esc e devolve o foco
   para quem a abriu. */
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);
  /* guardado num ref: quem usa costuma passar uma função nova a cada
     render, e o efeito abaixo deve rodar uma vez só (senão o foco
     pula enquanto se digita) */
  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const el = caixa.current;
    /* foco inicial: o primeiro campo de texto (não o botão de fechar) */
    if (el && !el.contains(document.activeElement))
      (el.querySelector<HTMLElement>("input:not([type=checkbox]), textarea, select") ?? el.querySelector<HTMLElement>(FOCAVEIS))?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        fechar.current();
      }
      if (e.key !== "Tab" || !el) return;
      const itens = [...el.querySelectorAll<HTMLElement>(FOCAVEIS)];
      if (!itens.length) return;
      const [primeiro, ultimo] = [itens[0], itens[itens.length - 1]];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("keydown", tecla);
      anterior?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-start sm:pt-[10vh]">
      <button type="button" aria-label="Fechar" tabIndex={-1} className="absolute inset-0 bg-black/35" onClick={onFechar} />
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-folha p-4 pb-8 shadow-2xl sm:rounded-2xl sm:pb-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{titulo}</h2>
          <button type="button" aria-label="Fechar" onClick={onFechar} className="p-1 text-lapis hover:text-grafite">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
