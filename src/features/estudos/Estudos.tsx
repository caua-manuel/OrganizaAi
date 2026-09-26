/* Estudos: próximas avaliações (destaque nos próximos 7 dias), matérias
   com notas e situação, cursos com +1 aula e o tempo de estudo lado a
   lado com o de projetos, porque os dois disputam o mesmo tempo. */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2 } from "lucide-react";
import { db } from "../../db/db";
import {
  apagarAvaliacao,
  apagarMateria,
  atualizarAvaliacao,
  atualizarMateria,
  criarAvaliacao,
  criarCurso,
  criarMateria,
  maisUmaAula,
} from "../../db/acoes";
import { useSettings } from "../../db/hooks";
import type { Assessment, Subject } from "../../db/types";
import { dentro, fmtData, hojeISO, semanaAtual, ultimasSemanas } from "../../lib/datas";
import { fmtNota, mediaMateria, proximasAvaliacoes, situacaoMateria } from "../../lib/estudos";
import { progressoHabito } from "../../lib/habitos";
import { GraficoDuplo } from "../../ui/GraficoDuplo";
import { useToast } from "../../ui/Toast";
import { Barra, Botao, Cabecalho, Etiqueta, Indicador, Painel, Vazio } from "../../ui/ui";
import { textoHabito, useHabitos } from "../saude/useHabitos";

const ROXO = "var(--pilar-estudos)";

export function Estudos() {
  const dados = useLiveQuery(async () => {
    const [materias, avaliacoes, cursos, focos] = await Promise.all([
      db.subjects.toArray(),
      db.assessments.toArray(),
      db.courses.toArray(),
      db.focusSessions.toArray(),
    ]);
    materias.sort((a, b) => a.name.localeCompare(b.name));
    return { materias, avaliacoes, cursos, focos };
  }, []);
  const h = useHabitos();
  const { startDate, endDate } = useSettings();
  if (!dados) return null;
  const hoje = hojeISO();
  const semana = semanaAtual(hoje);
  const proximas = proximasAvaliacoes(dados.avaliacoes, hoje).slice(0, 6);
  const nomeMateria = new Map(dados.materias.map((m) => [m.id, m.name]));
  const habito = h?.habitos.find((x) => x.link === "foco:estudos" && x.active);
  const minutos = (pilar: "estudos" | "projetos", s: { inicio: string; fim: string }) =>
    dados.focos.filter((f) => f.pillar === pilar && dentro(f.date, s)).reduce((t, f) => t + f.minutes, 0);
  const comparacao = ultimasSemanas(8, hoje).map((s) => ({
    rotulo: fmtData(s.inicio, "dd/MM"),
    detalhe: `Semana de ${fmtData(s.inicio)}`,
    estudos: minutos("estudos", s),
    projetos: minutos("projetos", s),
  }));
  const concluidosNoPeriodo = dados.cursos.filter((c) => c.finishedAt && c.finishedAt >= startDate && c.finishedAt <= endDate).length;

  return (
    <>
      <Cabecalho titulo="Estudos" sub="Passar em todas as matérias e concluir pelo menos um curso." />
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Painel titulo="Próximas avaliações" pilar="estudos">
            {proximas.length === 0 ? (
              <Vazio>Nenhuma prova ou trabalho marcado. Adicione nas matérias abaixo.</Vazio>
            ) : (
              <ul className="divide-y divide-linha">
                {proximas.map(({ avaliacao: a, emBreve }) => (
                  <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className={`w-12 shrink-0 ${emBreve ? "font-semibold" : "text-lapis"}`}>{fmtData(a.date, "dd/MM")}</span>
                    <span className="flex-1 truncate">
                      {a.title} <span className="text-lapis">· {nomeMateria.get(a.subjectId)}</span>
                    </span>
                    {emBreve && <Etiqueta cor={ROXO}>{a.date === hoje ? "hoje" : "esta semana"}</Etiqueta>}
                  </li>
                ))}
              </ul>
            )}
          </Painel>

          <Painel titulo="Estudo × projetos" pilar="estudos">
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              {habito && h ? (
                (() => {
                  const p = progressoHabito(habito, semana, h.dados);
                  return <Indicador nome={habito.title} texto={textoHabito(p.valor, p.meta, "minutos")} valor={p.valor} meta={p.meta} cor={ROXO} />;
                })()
              ) : (
                <p className="text-sm">Estudo: {minutos("estudos", semana)} min</p>
              )}
              <p className="self-end text-sm text-lapis">Projetos nesta semana: {minutos("projetos", semana)} min</p>
            </div>
            <GraficoDuplo
              titulo="Minutos de estudo e de projetos nas últimas 8 semanas"
              dados={comparacao}
              series={[
                { chave: "estudos", nome: "Estudo", cor: ROXO },
                { chave: "projetos", nome: "Projetos", cor: "var(--pilar-projetos)" },
              ]}
              formatar={(v) => `${v}`}
              altura={170}
            />
          </Painel>
        </div>

        <Materias materias={dados.materias} avaliacoes={dados.avaliacoes} />

        <Painel titulo="Cursos" pilar="estudos" acao={<span className="text-sm text-lapis">{concluidosNoPeriodo} de 1 concluído no período</span>}>
          <Cursos cursos={dados.cursos} />
        </Painel>
      </div>
    </>
  );
}

function Materias({ materias, avaliacoes }: { materias: Subject[]; avaliacoes: Assessment[] }) {
  const [nome, setNome] = useState("");
  const [semestre, setSemestre] = useState("");
  const [media, setMedia] = useState("6");
  const avisar = useToast();
  const cursando = materias.filter((m) => m.status === "cursando");
  const outras = materias.filter((m) => m.status !== "cursando");
  return (
    <Painel titulo="Faculdade" pilar="estudos">
      {materias.length === 0 && <Vazio>Nenhuma matéria cadastrada. Adicione as do período abaixo.</Vazio>}
      <div className="grid gap-3 lg:grid-cols-2">
        {[...cursando, ...outras].map((m) => (
          <Materia key={m.id} materia={m} avaliacoes={avaliacoes.filter((a) => a.subjectId === m.id)} />
        ))}
      </div>
      <form
        className="mt-4 grid gap-2 border-t border-linha pt-3 sm:grid-cols-[1.5fr_1fr_7rem_auto]"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!nome.trim()) return;
          await criarMateria({ name: nome, semester: semestre.trim(), passingGrade: Number(media.replace(",", ".")) || 6, status: "cursando" });
          avisar("Matéria adicionada");
          setNome("");
        }}
      >
        <input aria-label="Nome da matéria" className="campo" placeholder="Nova matéria" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input aria-label="Período" className="campo" placeholder="Período (ex.: 2026.2)" value={semestre} onChange={(e) => setSemestre(e.target.value)} />
        <input aria-label="Média para passar" inputMode="decimal" className="campo num" placeholder="Média" value={media} onChange={(e) => setMedia(e.target.value)} />
        <Botao type="submit">Adicionar</Botao>
      </form>
    </Painel>
  );
}

function Materia({ materia: m, avaliacoes }: { materia: Subject; avaliacoes: Assessment[] }) {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState(hojeISO());
  const [peso, setPeso] = useState("");
  const media = mediaMateria(m.id, avaliacoes);
  const sit = situacaoMateria(m, media);
  const ordenadas = [...avaliacoes].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="rounded-xl border border-linha p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="flex-1 font-semibold">
          {m.name} {m.semester && <span className="text-sm font-normal text-lapis">· {m.semester}</span>}
        </h3>
        <span className="num text-sm">{media != null ? fmtNota(media) : "—"}</span>
        <Etiqueta cor={sit.ok === false ? "var(--pilar-saude)" : ROXO}>{sit.texto}</Etiqueta>
      </div>
      <ul className="text-sm">
        {ordenadas.map((a) => (
          <li key={a.id} className="grid grid-cols-[1fr_4.5rem_3.5rem_4rem_auto] items-center gap-1.5 py-1">
            <span className="truncate" title={a.title}>
              {a.title}
            </span>
            <span className="text-xs text-lapis">{fmtData(a.date, "dd/MM")}</span>
            <span className="text-xs text-lapis">{a.weight != null ? `peso ${a.weight}` : ""}</span>
            <input
              aria-label={`Nota de ${a.title}`}
              inputMode="decimal"
              className="campo num px-2 py-0.5 text-sm"
              placeholder="nota"
              key={a.grade ?? "vazio"}
              defaultValue={a.grade != null ? fmtNota(a.grade) : ""}
              onBlur={(e) => {
                const t = e.target.value.trim().replace(",", ".");
                const n = t === "" ? undefined : Number(t);
                if (n !== undefined && Number.isNaN(n)) return;
                if (n !== a.grade) atualizarAvaliacao(a.id, { grade: n });
              }}
            />
            <button type="button" aria-label={`Apagar ${a.title}`} className="rounded-lg p-1 text-lapis hover:text-grafite" onClick={() => apagarAvaliacao(a.id)}>
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 grid grid-cols-[1fr_8.5rem_4.25rem_auto] gap-1.5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!titulo.trim()) return;
          const w = Number(peso.replace(",", "."));
          await criarAvaliacao({ subjectId: m.id, title: titulo, date: data, weight: peso && w > 0 ? w : undefined });
          setTitulo("");
          setPeso("");
        }}
      >
        <input aria-label="Nova avaliação" className="campo py-1 text-sm" placeholder="Prova, trabalho…" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <input aria-label="Data" type="date" className="campo py-1 text-sm" value={data} onChange={(e) => setData(e.target.value)} />
        <input aria-label="Peso" inputMode="decimal" className="campo py-1 text-sm" placeholder="peso" value={peso} onChange={(e) => setPeso(e.target.value)} />
        <Botao type="submit" tamanho="p">
          +
        </Botao>
      </form>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-lapis">
        <span>Média para passar: {fmtNota(m.passingGrade)}</span>
        <span className="flex items-center gap-1">
          <select
            aria-label={`Situação de ${m.name}`}
            className="bg-transparent"
            value={m.status}
            onChange={(e) => atualizarMateria(m.id, { status: e.target.value as Subject["status"] })}
          >
            <option value="cursando">Cursando</option>
            <option value="aprovado">Aprovado</option>
            <option value="reprovado">Reprovado</option>
          </select>
          <button
            type="button"
            aria-label={`Apagar matéria ${m.name}`}
            className="rounded p-1 hover:text-grafite"
            onClick={() => window.confirm(`Apagar ${m.name} e suas avaliações?`) && apagarMateria(m.id)}
          >
            <Trash2 size={13} />
          </button>
        </span>
      </div>
    </div>
  );
}

function Cursos({ cursos }: { cursos: { id: string; name: string; totalLessons: number; doneLessons: number; finishedAt?: string }[] }) {
  const [nome, setNome] = useState("");
  const [aulas, setAulas] = useState("");
  const avisar = useToast();
  const andamento = cursos.filter((c) => !c.finishedAt);
  const concluidos = cursos.filter((c) => c.finishedAt);
  return (
    <div>
      {andamento.length === 0 && <Vazio>Nenhum curso em andamento.</Vazio>}
      <ul className="grid gap-3">
        {andamento.map((c) => (
          <li key={c.id}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-medium">{c.name}</span>
              <span className="flex items-center gap-2">
                <span className="num text-sm text-lapis">
                  {c.doneLessons}/{c.totalLessons} aulas
                </span>
                <Botao tamanho="p" aria-label={`Desfazer uma aula de ${c.name}`} variante="fantasma" onClick={() => maisUmaAula(c.id, -1)}>
                  −1
                </Botao>
                <Botao
                  tamanho="p"
                  onClick={async () => {
                    await maisUmaAula(c.id);
                    if (c.doneLessons + 1 >= c.totalLessons) avisar(`${c.name} concluído ✓`);
                  }}
                >
                  +1 aula
                </Botao>
              </span>
            </div>
            <Barra valor={c.doneLessons} meta={c.totalLessons} cor={ROXO} rotulo={`Progresso de ${c.name}`} />
          </li>
        ))}
      </ul>
      {concluidos.length > 0 && (
        <p className="mt-3 text-sm text-lapis">
          Concluídos: {concluidos.map((c) => `${c.name} (${fmtData(c.finishedAt!, "MMM/yy")})`).join(", ")}
        </p>
      )}
      <form
        className="mt-4 flex flex-wrap gap-2 border-t border-linha pt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const total = Math.round(Number(aulas));
          if (!nome.trim() || !(total > 0)) return;
          await criarCurso(nome, total);
          setNome("");
          setAulas("");
        }}
      >
        <input aria-label="Nome do curso" className="campo max-w-64" placeholder="Novo curso" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input aria-label="Total de aulas" type="number" min={1} className="campo num w-28" placeholder="Nº de aulas" value={aulas} onChange={(e) => setAulas(e.target.value)} />
        <Botao type="submit">Adicionar</Botao>
      </form>
    </div>
  );
}
