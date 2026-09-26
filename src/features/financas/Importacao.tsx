/* Importar extrato em 3 passos:
   1. escolher o arquivo (CSV ou OFX);
   2. só para CSV: dizer qual coluna é data, valor e descrição (fica
      salvo por banco, então só se faz na primeira vez);
   3. prévia: categoria sugerida pelas regras, duplicadas esmaecidas
      (não entram) e linhas com problema apontadas pelo número. */
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft } from "lucide-react";
import { db } from "../../db/db";
import { importarLinhas, salvarMapeamento } from "../../db/acoes";
import type { Category, ImportMapping } from "../../db/types";
import { fmtData } from "../../lib/datas";
import { formatarReais } from "../../lib/dinheiro";
import { categorizar, importHash, palavraChave } from "../../lib/financas";
import { adivinharColunas, aplicarMapeamento, FORMATOS_DATA, lerCSV, lerOFX, pareceOFX } from "../../lib/importacao";
import type { LinhaExtrato, Problema } from "../../lib/importacao";
import { SugestaoRegra } from "./SugestaoRegra";
import { Botao, Cabecalho, Painel, Vazio } from "../../ui/ui";

type Mapa = Omit<ImportMapping, "id" | "createdAt" | "updatedAt">;

/* Muitos bancos exportam em Latin-1: se o UTF-8 vier com "�", relê. */
async function lerTexto(arquivo: File) {
  const buf = await arquivo.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buf);
  return utf8.includes("�") ? new TextDecoder("iso-8859-1").decode(buf) : utf8;
}

export function Importacao() {
  const [etapa, setEtapa] = useState<"arquivo" | "colunas" | "previa" | "fim">("arquivo");
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [csv, setCsv] = useState<{ colunas: string[]; linhas: Record<string, string>[] } | null>(null);
  const [lidas, setLidas] = useState<{ ok: LinhaExtrato[]; problemas: Problema[] }>({ ok: [], problemas: [] });
  const [importadas, setImportadas] = useState(0);
  const [erro, setErro] = useState("");

  async function escolher(arquivo: File) {
    setErro("");
    setNomeArquivo(arquivo.name);
    const texto = await lerTexto(arquivo);
    if (pareceOFX(texto) || arquivo.name.toLowerCase().endsWith(".ofx")) {
      const r = lerOFX(texto);
      if (!r.ok.length) return setErro("Não encontrei lançamentos nesse OFX.");
      setLidas(r);
      setEtapa("previa");
    } else {
      const r = lerCSV(texto);
      if (!r.colunas.length || !r.linhas.length) return setErro("Não consegui ler esse CSV. Ele tem uma linha de cabeçalho?");
      setCsv(r);
      setEtapa("colunas");
    }
  }

  return (
    <>
      <Cabecalho
        titulo="Importar extrato"
        sub={nomeArquivo || "CSV ou OFX exportado pelo seu banco. O arquivo é lido aqui no navegador e não sai do seu computador."}
        acoes={
          <Link to="/financas" className="inline-flex items-center gap-1 text-sm text-lapis hover:text-grafite">
            <ArrowLeft size={16} aria-hidden="true" /> Finanças
          </Link>
        }
      />
      {etapa === "arquivo" && <EscolherArquivo onArquivo={escolher} erro={erro} />}
      {etapa === "colunas" && csv && (
        <Colunas
          csv={csv}
          onPronto={(r) => {
            setLidas(r);
            setEtapa("previa");
          }}
          onVoltar={() => setEtapa("arquivo")}
        />
      )}
      {etapa === "previa" && (
        <Previa
          lidas={lidas}
          onImportado={(n) => {
            setImportadas(n);
            setEtapa("fim");
          }}
          onVoltar={() => setEtapa("arquivo")}
        />
      )}
      {etapa === "fim" && (
        <Painel pilar="financas">
          <p className="mb-3">
            {importadas === 1 ? "1 lançamento importado." : `${importadas} lançamentos importados.`}
          </p>
          <div className="flex gap-2">
            <Link to="/financas" className="rounded-[10px] bg-grafite px-3.5 py-2 text-sm font-medium text-papel">
              Ver finanças
            </Link>
            <Botao onClick={() => (setEtapa("arquivo"), setNomeArquivo(""))}>Importar outro</Botao>
          </div>
        </Painel>
      )}
    </>
  );
}

function EscolherArquivo({ onArquivo, erro }: { onArquivo: (f: File) => void; erro: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [sobre, setSobre] = useState(false);
  return (
    <Painel pilar="financas">
      <div
        onDragOver={(e) => (e.preventDefault(), setSobre(true))}
        onDragLeave={() => setSobre(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSobre(false);
          const f = e.dataTransfer.files[0];
          if (f) onArquivo(f);
        }}
        className="grid place-items-center gap-3 rounded-xl border-2 border-dashed px-4 py-10 text-center"
        style={{ borderColor: sobre ? "var(--pilar-financas)" : "var(--cor-linha)" }}
      >
        <p className="text-sm text-lapis">Arraste o arquivo para cá ou</p>
        <Botao variante="primario" onClick={() => input.current?.click()}>
          Escolher arquivo
        </Botao>
        <input
          ref={input}
          type="file"
          accept=".csv,.ofx,.txt,text/csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onArquivo(e.target.files[0])}
        />
      </div>
      {erro && (
        <p role="alert" className="mt-3 text-sm text-[#C2410C]">
          {erro}
        </p>
      )}
    </Painel>
  );
}

function Colunas({
  csv,
  onPronto,
  onVoltar,
}: {
  csv: { colunas: string[]; linhas: Record<string, string>[] };
  onPronto: (r: { ok: LinhaExtrato[]; problemas: Problema[] }) => void;
  onVoltar: () => void;
}) {
  const salvos = useLiveQuery(() => db.importMappings.toArray(), []) ?? [];
  /* mapeamento salvo cujas colunas existem neste arquivo */
  const compativel = salvos.find((m) => [m.dateColumn, m.amountColumn, m.descriptionColumn].every((c) => csv.colunas.includes(c)));
  const [mapa, setMapa] = useState<Mapa | null>(null);
  const atual: Mapa = mapa ??
    (compativel && {
      bankName: compativel.bankName,
      dateColumn: compativel.dateColumn,
      dateFormat: compativel.dateFormat,
      amountColumn: compativel.amountColumn,
      descriptionColumn: compativel.descriptionColumn,
      invertSign: compativel.invertSign,
    }) ?? { bankName: "", dateFormat: "DD/MM/YYYY", invertSign: false, ...adivinharColunas(csv.colunas) };
  const muda = (m: Partial<Mapa>) => setMapa({ ...atual, ...m });

  const teste = aplicarMapeamento(csv.linhas.slice(0, 3), atual);
  const completo = atual.bankName.trim() && atual.dateColumn && atual.amountColumn && atual.descriptionColumn;

  const Seletor = ({ id, rotulo, campo }: { id: string; rotulo: string; campo: "dateColumn" | "amountColumn" | "descriptionColumn" }) => (
    <div>
      <label className="rotulo" htmlFor={id}>
        {rotulo}
      </label>
      <select id={id} className="campo" value={atual[campo]} onChange={(e) => muda({ [campo]: e.target.value })}>
        <option value="">Escolha…</option>
        {csv.colunas.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    </div>
  );

  return (
    <Painel titulo="Quais colunas são quais?" pilar="financas">
      {compativel && !mapa && (
        <p className="mb-3 text-sm text-lapis">Usando o formato salvo de {compativel.bankName}. Confira abaixo.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="banco">
            Nome do banco
          </label>
          <input
            id="banco"
            className="campo"
            placeholder="Ex.: Nubank"
            value={atual.bankName}
            onChange={(e) => muda({ bankName: e.target.value })}
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="fmt">
            Formato da data
          </label>
          <select id="fmt" className="campo" value={atual.dateFormat} onChange={(e) => muda({ dateFormat: e.target.value })}>
            {FORMATOS_DATA.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
        {Seletor({ id: "col-data", rotulo: "Coluna da data", campo: "dateColumn" })}
        {Seletor({ id: "col-valor", rotulo: "Coluna do valor", campo: "amountColumn" })}
        {Seletor({ id: "col-desc", rotulo: "Coluna da descrição", campo: "descriptionColumn" })}
        <label className="mt-6 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={atual.invertSign} onChange={(e) => muda({ invertSign: e.target.checked })} />
          Gastos aparecem positivos no arquivo (inverter sinal)
        </label>
      </div>

      <h3 className="mt-5 mb-1 text-sm font-semibold">Como as primeiras linhas vão ficar</h3>
      <ul className="text-sm">
        {teste.ok.map((l) => (
          <li key={l.origem} className="flex justify-between gap-2 border-b border-linha py-1">
            <span className="text-lapis">{fmtData(l.date, "dd/MM/yyyy")}</span>
            <span className="flex-1 truncate">{l.description}</span>
            <span className="num">{formatarReais(l.amount)}</span>
          </li>
        ))}
        {teste.problemas.map((p) => (
          <li key={p.origem} className="py-1 text-[#C2410C]">
            Linha {p.origem}: {p.motivo}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-2">
        <Botao
          variante="primario"
          disabled={!completo}
          onClick={async () => {
            await salvarMapeamento({ ...atual, bankName: atual.bankName.trim() });
            onPronto(aplicarMapeamento(csv.linhas, atual));
          }}
        >
          Continuar
        </Botao>
        <Botao variante="fantasma" onClick={onVoltar}>
          Outro arquivo
        </Botao>
      </div>
    </Painel>
  );
}

function Previa({
  lidas,
  onImportado,
  onVoltar,
}: {
  lidas: { ok: LinhaExtrato[]; problemas: Problema[] };
  onImportado: (n: number) => void;
  onVoltar: () => void;
}) {
  const base = useLiveQuery(async () => {
    const [cats, regras] = await Promise.all([db.categories.toArray(), db.categoryRules.toArray()]);
    const hashes = lidas.ok.map((l) => importHash(l.date, l.amount, l.description));
    const jaExistem = new Set((await db.transactions.where("importHash").anyOf(hashes).toArray()).map((t) => t.importHash));
    return { cats, regras, jaExistem };
  }, [lidas]);
  const [escolhas, setEscolhas] = useState<Record<number, string>>({});
  const [sugestao, setSugestao] = useState<{ palavra: string; categoria: Category } | null>(null);

  const linhas = useMemo(() => {
    if (!base) return [];
    const vistos = new Set<string>();
    const semCat = base.cats.find((c) => c.name === "Sem categoria");
    const outrasEntradas = base.cats.find((c) => c.name === "Outras entradas");
    return lidas.ok.map((l) => {
      const h = importHash(l.date, l.amount, l.description);
      const duplicada = base.jaExistem.has(h) || vistos.has(h);
      vistos.add(h);
      const regra = categorizar(l.description, base.regras);
      const sugerida = regra?.categoryId ?? (l.amount < 0 ? semCat?.id : outrasEntradas?.id) ?? "";
      return { ...l, duplicada, regra, categoryId: escolhas[l.origem] ?? sugerida };
    });
  }, [base, lidas, escolhas]);

  if (!base) return null;
  const novas = linhas.filter((l) => !l.duplicada);
  const catPorId = new Map(base.cats.map((c) => [c.id, c]));
  const semCategoria = novas.filter((l) => catPorId.get(l.categoryId)?.name === "Sem categoria").length;

  return (
    <Painel titulo="Prévia" pilar="financas">
      <p className="mb-3 text-sm text-lapis">
        {novas.length} novos
        {linhas.length - novas.length > 0 && ` · ${linhas.length - novas.length} já importados (esmaecidos, não entram)`}
        {semCategoria > 0 && ` · ${semCategoria} sem categoria`}
        {lidas.problemas.length > 0 && ` · ${lidas.problemas.length} ${lidas.problemas.length === 1 ? "linha" : "linhas"} com problema`}
      </p>

      {sugestao && <SugestaoRegra key={sugestao.palavra + sugestao.categoria.id} {...sugestao} onFechar={() => setSugestao(null)} />}

      {linhas.length === 0 ? (
        <Vazio>Nenhum lançamento válido no arquivo.</Vazio>
      ) : (
        <ul className="divide-y divide-linha">
          {linhas.map((l) => (
            <li
              key={l.origem}
              className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 py-2 sm:grid-cols-[5.5rem_1fr_11rem_7rem]"
              style={{ opacity: l.duplicada ? 0.4 : 1 }}
            >
              <span className="text-xs text-lapis sm:text-sm">{fmtData(l.date, "dd/MM/yy")}</span>
              <span className="col-span-2 min-w-0 truncate text-sm sm:col-span-1" title={`Linha ${l.origem}: ${l.description}`}>
                {l.description}
                {l.duplicada && <span className="text-lapis"> · já importado</span>}
              </span>
              <select
                aria-label={`Categoria de ${l.description}`}
                disabled={l.duplicada}
                className="campo py-1 text-sm"
                title={l.regra ? `Pela regra "${l.regra.contains}"` : "Nenhuma regra encontrada"}
                value={l.categoryId}
                onChange={(e) => {
                  setEscolhas({ ...escolhas, [l.origem]: e.target.value });
                  const c = catPorId.get(e.target.value);
                  if (c && c.name !== "Sem categoria") setSugestao({ palavra: palavraChave(l.description), categoria: c });
                }}
              >
                {base.cats
                  .filter((c) => c.type === (l.amount < 0 ? "saida" : "entrada"))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              <span className="num text-right text-sm">{formatarReais(l.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      {lidas.problemas.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-lapis">Linhas que não entraram</summary>
          <ul className="mt-1 list-disc pl-5 text-lapis">
            {lidas.problemas.map((p) => (
              <li key={p.origem}>
                Linha {p.origem}: {p.motivo}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-4 flex gap-2">
        <Botao
          variante="primario"
          disabled={novas.length === 0}
          onClick={async () => onImportado(await importarLinhas(novas.map(({ date, amount, description, categoryId }) => ({ date, amount, description, categoryId }))))}
        >
          Importar {novas.length} {novas.length === 1 ? "lançamento" : "lançamentos"}
        </Botao>
        <Botao variante="fantasma" onClick={onVoltar}>
          Cancelar
        </Botao>
      </div>
    </Painel>
  );
}
