/* Aviso curto no rodapé ("Gasto salvo · Desfazer"). Fica 5 s.
   Um aviso por vez: o novo substitui o anterior. */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface Aviso {
  id: number;
  texto: string;
  desfazer?: () => unknown;
}

type Avisar = (texto: string, desfazer?: () => unknown) => void;

const Contexto = createContext<Avisar>(() => {});

export const useToast = () => useContext(Contexto);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const timer = useRef<number>(0);

  const avisar = useCallback<Avisar>((texto, desfazer) => {
    window.clearTimeout(timer.current);
    setAviso({ id: Date.now(), texto, desfazer });
    timer.current = window.setTimeout(() => setAviso(null), 5000);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <Contexto.Provider value={avisar}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-6">
        {aviso && (
          <div
            key={aviso.id}
            className="pointer-events-auto flex items-center gap-3 rounded-xl bg-grafite px-4 py-2.5 text-sm text-papel shadow-lg"
          >
            <span>{aviso.texto}</span>
            {aviso.desfazer && (
              <button
                type="button"
                className="font-semibold underline underline-offset-2"
                onClick={async () => {
                  await aviso.desfazer?.();
                  setAviso(null);
                }}
              >
                Desfazer
              </button>
            )}
          </div>
        )}
      </div>
    </Contexto.Provider>
  );
}
