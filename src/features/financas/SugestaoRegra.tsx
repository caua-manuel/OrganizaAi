/* "Sempre classificar 'IFOOD' como Comer fora?" — aparece quando a
   pessoa corrige uma categoria. A palavra é editável antes de salvar. */
import { useState } from "react";
import { criarRegra } from "../../db/acoes";
import type { Category } from "../../db/types";
import { useToast } from "../../ui/Toast";
import { Botao } from "../../ui/ui";

export function SugestaoRegra({ palavra, categoria, onFechar }: { palavra: string; categoria: Category; onFechar: () => void }) {
  const [texto, setTexto] = useState(palavra);
  const avisar = useToast();
  return (
    <form
      className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-papel p-3 text-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!texto.trim()) return;
        await criarRegra(texto, categoria.id);
        avisar(`Regra criada: "${texto.trim().toUpperCase()}" → ${categoria.name}`);
        onFechar();
      }}
    >
      <span>Sempre classificar</span>
      <input
        aria-label="Texto que identifica o lançamento"
        className="campo w-36 py-1"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <span>
        como <strong>{categoria.name}</strong>?
      </span>
      <Botao type="submit" tamanho="p" variante="primario">
        Sim, criar regra
      </Botao>
      <Botao tamanho="p" variante="fantasma" onClick={onFechar}>
        Agora não
      </Botao>
    </form>
  );
}
