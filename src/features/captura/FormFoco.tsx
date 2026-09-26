/* Foco: Projeto ou Estudo → 30/60/90 min → (qual projeto).
   Com um projeto ativo só, ele é escolhido sozinho: 3 toques. */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { registrarFoco } from "../../db/acoes";
import type { FocusSession } from "../../db/types";
import { useToast } from "../../ui/Toast";
import { Chip } from "../../ui/ui";

const MINUTOS = [30, 60, 90];

export function FormFoco({ onPronto }: { onPronto: () => void }) {
  const [pilar, setPilar] = useState<FocusSession["pillar"] | null>(null);
  const [minutos, setMinutos] = useState<number | null>(null);
  const projetos = useLiveQuery(() => db.projects.where("status").equals("ativo").toArray(), []) ?? [];
  const avisar = useToast();

  async function salvar(p: FocusSession["pillar"], min: number, projectId?: string) {
    const desfazer = await registrarFoco(p, min, projectId);
    const nome = projectId ? projetos.find((x) => x.id === projectId)?.name : p === "estudos" ? "estudo" : "projetos";
    avisar(`${min} min de foco em ${nome}`, desfazer);
    onPronto();
  }

  function escolherMinutos(min: number) {
    if (pilar === "estudos") return salvar("estudos", min);
    if (projetos.length <= 1) return salvar("projetos", min, projetos[0]?.id);
    setMinutos(min);
  }

  const Grande = ({ texto, onClick, cor, auto }: { texto: string; onClick: () => void; cor: string; auto?: boolean }) => (
    <button
      type="button"
      autoFocus={auto}
      onClick={onClick}
      className="rounded-2xl border border-linha px-3 py-5 text-base font-semibold hover:bg-papel"
      style={{ borderLeft: `4px solid ${cor}` }}
    >
      {texto}
    </button>
  );

  if (!pilar)
    return (
      <div className="grid grid-cols-2 gap-3">
        {Grande({ texto: "Projeto", onClick: () => setPilar("projetos"), cor: "var(--pilar-projetos)", auto: true })}
        {Grande({ texto: "Estudo", onClick: () => setPilar("estudos"), cor: "var(--pilar-estudos)" })}
      </div>
    );

  if (minutos == null)
    return (
      <div>
        <p className="mb-2 text-sm text-lapis">Quanto tempo de {pilar === "estudos" ? "estudo" : "projeto"}?</p>
        <div className="grid grid-cols-3 gap-3">
          {MINUTOS.map((m, i) =>
            Grande({ texto: `${m} min`, onClick: () => escolherMinutos(m), cor: `var(--pilar-${pilar})`, auto: i === 0 }),
          )}
        </div>
      </div>
    );

  return (
    <div>
      <p className="mb-2 text-sm text-lapis">Em qual projeto?</p>
      <div className="flex flex-wrap gap-1.5">
        {projetos.map((p) => (
          <Chip key={p.id} cor="var(--pilar-projetos)" onClick={() => salvar("projetos", minutos, p.id)}>
            {p.name}
          </Chip>
        ))}
        <Chip onClick={() => salvar("projetos", minutos)}>Nenhum em especial</Chip>
      </div>
    </div>
  );
}
