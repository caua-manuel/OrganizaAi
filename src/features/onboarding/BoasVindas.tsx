/* Primeiro uso: 5 passos curtos que já preenchem os dados reais.
   Tudo pode ser pulado; cada passo só grava o que foi preenchido. */
import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { db } from "../../db/db";
import { criarCurso, criarMateria, criarProjeto } from "../../db/acoes";
import { salvarSettings, useSettings } from "../../db/hooks";
import { hojeISO, somarMeses } from "../../lib/datas";
import { lerReais } from "../../lib/dinheiro";
import { agora } from "../../lib/id";
import { Botao, Painel } from "../../ui/ui";

const PASSOS = ["Período", "Dinheiro", "Treinos", "Estudos", "Projetos"];

export function BoasVindas() {
  const navegar = useNavigate();
  const settings = useSettings();
  const [passo, setPasso] = useState(0);
  const [f, setF] = useState({
    inicio: hojeISO(),
    fim: somarMeses(hojeISO(), 6),
    viagem: "",
    viagemData: "",
    reserva: "",
    reservaAuto: true,
    academia: "3",
    jiu: "1",
    materias: "",
    semestre: "",
    curso: "",
    aulas: "",
    projetos: "",
  });
  const muda = (m: Partial<typeof f>) => setF({ ...f, ...m });
  const linhas = (t: string) =>
    t
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

  async function gravar(p: number) {
    if (p === 0 && f.inicio && f.fim > f.inicio) await salvarSettings({ startDate: f.inicio, endDate: f.fim });
    if (p === 1) {
      const metas = await db.savingsGoals.toArray();
      const viagem = metas.find((m) => m.name === "Viagem");
      const reserva = metas.find((m) => m.autoTarget || m.name.toLowerCase().includes("reserva"));
      const v = lerReais(f.viagem);
      if (viagem && v) await db.savingsGoals.update(viagem.id, { targetAmount: v, deadline: f.viagemData || undefined, updatedAt: agora() });
      const r = lerReais(f.reserva);
      if (reserva)
        await db.savingsGoals.update(reserva.id, {
          targetAmount: r ?? reserva.targetAmount,
          autoTarget: f.reservaAuto ? { monthsOfExpenses: 3 } : undefined,
          updatedAt: agora(),
        });
    }
    if (p === 2) {
      for (const [link, valor] of [
        ["treino:academia", f.academia],
        ["treino:jiujitsu", f.jiu],
      ] as const) {
        const h = await db.habits.where("link").equals(link).first();
        const n = Math.round(Number(valor));
        if (h && n > 0) await db.habits.update(h.id, { weeklyTarget: n, updatedAt: agora() });
      }
    }
    if (p === 3) {
      for (const nome of linhas(f.materias)) await criarMateria({ name: nome, semester: f.semestre.trim(), passingGrade: 6, status: "cursando" });
      const aulas = Math.round(Number(f.aulas));
      if (f.curso.trim() && aulas > 0) await criarCurso(f.curso, aulas);
    }
    if (p === 4) for (const nome of linhas(f.projetos)) await criarProjeto(nome);
  }

  async function concluir() {
    await salvarSettings({ onboardedAt: agora() });
    navegar("/", { replace: true });
  }

  async function avancar(salvar: boolean) {
    if (salvar) await gravar(passo);
    /* limpa o que foi gravado para não duplicar se voltar e avançar */
    if (salvar && passo === 3) muda({ materias: "", curso: "", aulas: "" });
    if (salvar && passo === 4) muda({ projetos: "" });
    if (passo === PASSOS.length - 1) return concluir();
    setPasso(passo + 1);
  }

  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem] font-semibold">Boas-vindas ao OrganizaAi</h1>
          <p className="mt-1 text-sm text-lapis">
            Passo {passo + 1} de {PASSOS.length} · {PASSOS[passo]}. Tudo pode ser mudado depois em Configurações.
          </p>
        </div>
        <Botao variante="fantasma" tamanho="p" onClick={concluir}>
          Pular tudo
        </Botao>
      </header>

      <div className="mb-4 flex gap-1.5" aria-hidden="true">
        {PASSOS.map((p, i) => (
          <span key={p} className="h-1 flex-1 rounded-full" style={{ background: i <= passo ? "var(--cor-grafite)" : "var(--cor-linha)" }} />
        ))}
      </div>

      <Painel>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            avancar(true);
          }}
        >
          {passo === 0 && (
            <>
              <p className="text-sm">São 6 meses de acompanhamento. Quando começa?</p>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Início" id="ob-inicio">
                  <input id="ob-inicio" type="date" className="campo" value={f.inicio} onChange={(e) => muda({ inicio: e.target.value, fim: somarMeses(e.target.value, 6) })} />
                </Campo>
                <Campo rotulo="Fim" id="ob-fim">
                  <input id="ob-fim" type="date" className="campo" value={f.fim} onChange={(e) => muda({ fim: e.target.value })} />
                </Campo>
              </div>
            </>
          )}

          {passo === 1 && (
            <>
              <p className="text-sm">Finanças são a prioridade. Quanto custa a viagem e quando ela é?</p>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Valor da viagem" id="ob-viagem">
                  <input id="ob-viagem" inputMode="decimal" className="campo num" placeholder="R$ 0,00" value={f.viagem} onChange={(e) => muda({ viagem: e.target.value })} />
                </Campo>
                <Campo rotulo="Data da viagem" id="ob-viagem-data">
                  <input id="ob-viagem-data" type="date" className="campo" value={f.viagemData} onChange={(e) => muda({ viagemData: e.target.value })} />
                </Campo>
              </div>
              <Campo rotulo="Reserva de emergência (valor)" id="ob-reserva">
                <input id="ob-reserva" inputMode="decimal" className="campo num" placeholder="R$ 0,00 ou deixe em branco" value={f.reserva} onChange={(e) => muda({ reserva: e.target.value })} />
              </Campo>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.reservaAuto} onChange={(e) => muda({ reservaAuto: e.target.checked })} />
                Calcular depois como 3 × meu gasto médio mensal (quando houver 3 meses de dados)
              </label>
              <p className="text-xs text-lapis">
                Meta mensal de guardar: R$ {(settings.monthlySavingsBase / 100).toFixed(0)} + o que entrar de VoIP. Ajuste em Configurações.
              </p>
            </>
          )}

          {passo === 2 && (
            <>
              <p className="text-sm">Quantos treinos por semana, para começar? (O objetivo é chegar a 4× academia e 2× jiu-jitsu.)</p>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Academia por semana" id="ob-academia">
                  <input id="ob-academia" type="number" min={0} className="campo num" value={f.academia} onChange={(e) => muda({ academia: e.target.value })} />
                </Campo>
                <Campo rotulo="Jiu-jitsu por semana" id="ob-jiu">
                  <input id="ob-jiu" type="number" min={0} className="campo num" value={f.jiu} onChange={(e) => muda({ jiu: e.target.value })} />
                </Campo>
              </div>
            </>
          )}

          {passo === 3 && (
            <>
              <Campo rotulo="Matérias deste período (uma por linha)" id="ob-materias">
                <textarea id="ob-materias" rows={4} className="campo" placeholder={"Estrutura de Dados\nBanco de Dados"} value={f.materias} onChange={(e) => muda({ materias: e.target.value })} />
              </Campo>
              <Campo rotulo="Período" id="ob-semestre">
                <input id="ob-semestre" className="campo" placeholder="Ex.: 2026.2" value={f.semestre} onChange={(e) => muda({ semestre: e.target.value })} />
              </Campo>
              <div className="grid grid-cols-[1fr_8rem] gap-3">
                <Campo rotulo="Curso atual (opcional)" id="ob-curso">
                  <input id="ob-curso" className="campo" value={f.curso} onChange={(e) => muda({ curso: e.target.value })} />
                </Campo>
                <Campo rotulo="Nº de aulas" id="ob-aulas">
                  <input id="ob-aulas" type="number" min={1} className="campo num" value={f.aulas} onChange={(e) => muda({ aulas: e.target.value })} />
                </Campo>
              </div>
            </>
          )}

          {passo === 4 && (
            <Campo rotulo="Projetos ativos (um por linha)" id="ob-projetos">
              <textarea id="ob-projetos" rows={4} className="campo" placeholder={"App de treino\nPortfólio"} value={f.projetos} onChange={(e) => muda({ projetos: e.target.value })} />
            </Campo>
          )}

          <div className="mt-2 flex items-center justify-between">
            <Botao variante="fantasma" disabled={passo === 0} onClick={() => setPasso(passo - 1)}>
              Voltar
            </Botao>
            <div className="flex gap-2">
              <Botao variante="fantasma" onClick={() => avancar(false)}>
                Pular
              </Botao>
              <Botao type="submit" variante="primario">
                {passo === PASSOS.length - 1 ? "Concluir" : "Próximo"}
              </Botao>
            </div>
          </div>
        </form>
      </Painel>
    </div>
  );
}

function Campo({ rotulo, id, children }: { rotulo: string; id: string; children: ReactNode }) {
  return (
    <div>
      <label className="rotulo" htmlFor={id}>
        {rotulo}
      </label>
      {children}
    </div>
  );
}
