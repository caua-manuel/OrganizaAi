/* Gasto e Entrada na captura rápida.
   Gasto: digita o valor e toca na categoria — o toque já salva.
   Entrada: digita o valor e toca na origem. Se for VoIP e o VoIP vai
   para a poupança, pergunta se já guarda na meta. */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { categoriaDaOrigem, categoriasMaisUsadas, criarAporte, criarLancamento } from "../../db/acoes";
import { useSettings } from "../../db/hooks";
import { ORIGENS } from "../../db/types";
import type { Category, IncomeSource } from "../../db/types";
import { hojeISO } from "../../lib/datas";
import { lerReais, reais } from "../../lib/dinheiro";
import { useToast } from "../../ui/Toast";
import { Botao, Chip } from "../../ui/ui";

function CampoValor({
  valor,
  setValor,
  id,
  onEnter,
}: {
  valor: string;
  setValor: (v: string) => void;
  id: string;
  onEnter?: () => void;
}) {
  return (
    <div className="relative">
      <label className="sr-only" htmlFor={id}>
        Valor
      </label>
      <span className="num pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xl text-lapis">R$</span>
      <input
        id={id}
        autoFocus
        inputMode="decimal"
        autoComplete="off"
        className="campo num py-2.5 pl-11 text-2xl"
        placeholder="0,00"
        value={valor}
        onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
        /* o form tem outros campos escondidos, então o Enter não envia
           sozinho: tratamos aqui */
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
      />
    </div>
  );
}

/* data e descrição ficam escondidas: quase sempre é "hoje" */
function Detalhes({
  data,
  setData,
  descricao,
  setDescricao,
}: {
  data: string;
  setData: (v: string) => void;
  descricao: string;
  setDescricao: (v: string) => void;
}) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-lapis">{data === hojeISO() ? "Hoje" : data} · detalhes</summary>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <input type="date" aria-label="Data" className="campo" value={data} onChange={(e) => setData(e.target.value)} />
        <input
          aria-label="Descrição"
          className="campo"
          placeholder="Descrição (opcional)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </div>
    </details>
  );
}

export function FormGasto({ onPronto }: { onPronto: () => void }) {
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeISO());
  const [descricao, setDescricao] = useState("");
  const categorias = useLiveQuery(() => categoriasMaisUsadas(6), []) ?? [];
  const avisar = useToast();
  const centavos = lerReais(valor);
  const valido = centavos != null && centavos > 0;

  async function salvar(c: Category) {
    if (!valido) return;
    const { desfazer } = await criarLancamento({
      date: data,
      amount: -centavos!,
      description: descricao.trim() || c.name,
      categoryId: c.id,
    });
    avisar(`Gasto de ${reais(centavos!)} em ${c.name}`, desfazer);
    onPronto();
  }

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <CampoValor id="cap-gasto" valor={valor} setValor={setValor} onEnter={() => categorias[0] && salvar(categorias[0])} />
      <p className="mt-3 mb-1.5 text-xs text-lapis">Toque na categoria para salvar (Enter usa a primeira)</p>
      <div className="flex flex-wrap gap-1.5">
        {categorias.map((c) => (
          <Chip key={c.id} cor={c.color} disabled={!valido} onClick={() => salvar(c)} className="disabled:opacity-50">
            {c.name}
          </Chip>
        ))}
      </div>
      <Detalhes data={data} setData={setData} descricao={descricao} setDescricao={setDescricao} />
    </form>
  );
}

export function FormEntrada({ onPronto }: { onPronto: () => void }) {
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeISO());
  const [descricao, setDescricao] = useState("");
  const [guardar, setGuardar] = useState<{ centavos: number; meta: { id: string; name: string } } | null>(null);
  const settings = useSettings();
  const metaVoip = useLiveQuery(
    () => (settings.voipGoalId ? db.savingsGoals.get(settings.voipGoalId) : undefined),
    [settings.voipGoalId],
  );
  const avisar = useToast();
  const centavos = lerReais(valor);
  const valido = centavos != null && centavos > 0;

  async function salvar(origem: IncomeSource, nome: string) {
    if (!valido) return;
    const { desfazer } = await criarLancamento({
      date: data,
      amount: centavos!,
      description: descricao.trim() || nome,
      categoryId: await categoriaDaOrigem(origem),
      source: origem,
    });
    avisar(`Entrada de ${reais(centavos!)} (${nome})`, desfazer);
    if (origem === "voip" && settings.voipGoesToSavings && metaVoip) {
      setGuardar({ centavos: centavos!, meta: metaVoip });
    } else onPronto();
  }

  if (guardar) {
    return (
      <div>
        <p className="mb-4">
          Guardar <strong className="num">{reais(guardar.centavos)}</strong> na meta <strong>{guardar.meta.name}</strong>?
        </p>
        <div className="flex gap-2">
          <Botao
            variante="primario"
            autoFocus
            onClick={async () => {
              const desfazer = await criarAporte(guardar.meta.id, guardar.centavos, data, "VoIP");
              avisar(`Guardado ${reais(guardar.centavos)} em ${guardar.meta.name}`, desfazer);
              onPronto();
            }}
          >
            Guardar
          </Botao>
          <Botao variante="fantasma" onClick={onPronto}>
            Agora não
          </Botao>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <CampoValor id="cap-entrada" valor={valor} setValor={setValor} />
      <p className="mt-3 mb-1.5 text-xs text-lapis">De onde veio? Toque para salvar</p>
      <div className="flex flex-wrap gap-1.5">
        {ORIGENS.map((o) => (
          <Chip key={o.id} cor="var(--pilar-financas)" disabled={!valido} onClick={() => salvar(o.id, o.nome)} className="disabled:opacity-50">
            {o.nome}
          </Chip>
        ))}
      </div>
      <Detalhes data={data} setData={setData} descricao={descricao} setDescricao={setDescricao} />
    </form>
  );
}
