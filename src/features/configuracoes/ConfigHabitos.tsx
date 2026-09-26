/* Configurações de hábitos (metas semanais), lembretes de treino por
   dia da semana e áreas do trabalho. */
import { useState } from "react";
import { atualizarHabito } from "../../db/acoes";
import { db } from "../../db/db";
import { salvarSettings, useSettings } from "../../db/hooks";
import { PILARES } from "../../db/types";
import type { Habit, Pillar } from "../../db/types";
import { comBase } from "../../lib/id";
import { Botao, Painel } from "../../ui/ui";
import { useHabitos } from "../saude/useHabitos";

export function ConfigHabitos() {
  const h = useHabitos();
  const [novo, setNovo] = useState({ title: "", pillar: "saude" as Pillar, weeklyTarget: 3, unit: "vezes" as Habit["unit"] });
  if (!h) return null;
  return (
    <Painel titulo="Hábitos e metas semanais">
      <ul className="grid gap-2">
        {h.habitos.map((x) => (
          <li key={x.id} className="grid grid-cols-[auto_1fr_5rem_auto] items-center gap-2 text-sm">
            <input
              type="checkbox"
              aria-label={`${x.title} ativo`}
              checked={x.active}
              onChange={(e) => atualizarHabito(x.id, { active: e.target.checked })}
            />
            <input
              aria-label="Nome do hábito"
              className="campo"
              key={x.title}
              defaultValue={x.title}
              onBlur={(e) => e.target.value.trim() && e.target.value !== x.title && atualizarHabito(x.id, { title: e.target.value.trim() })}
            />
            <input
              aria-label={`Meta semanal de ${x.title}`}
              type="number"
              min={1}
              className="campo num"
              key={x.weeklyTarget}
              defaultValue={x.weeklyTarget}
              onBlur={(e) => {
                const n = Math.round(Number(e.target.value));
                if (n > 0 && n !== x.weeklyTarget) atualizarHabito(x.id, { weeklyTarget: n });
              }}
            />
            <span className="w-14 text-lapis">{x.unit === "minutos" ? "min/sem" : "×/sem"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-lapis">
        Academia, Jiu-jitsu e os de foco contam sozinhos pelos registros de treino e de foco. Desmarque para esconder um hábito.
      </p>
      <form
        className="mt-3 flex flex-wrap gap-2 border-t border-linha pt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!novo.title.trim()) return;
          await db.habits.add(comBase({ ...novo, title: novo.title.trim(), active: true }));
          setNovo({ ...novo, title: "" });
        }}
      >
        <input
          aria-label="Novo hábito"
          className="campo max-w-52"
          placeholder="Novo hábito"
          value={novo.title}
          onChange={(e) => setNovo({ ...novo, title: e.target.value })}
        />
        <select aria-label="Pilar" className="campo w-auto" value={novo.pillar} onChange={(e) => setNovo({ ...novo, pillar: e.target.value as Pillar })}>
          {PILARES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <input
          aria-label="Meta semanal"
          type="number"
          min={1}
          className="campo num w-20"
          value={novo.weeklyTarget}
          onChange={(e) => setNovo({ ...novo, weeklyTarget: Number(e.target.value) })}
        />
        <select aria-label="Unidade" className="campo w-auto" value={novo.unit} onChange={(e) => setNovo({ ...novo, unit: e.target.value as Habit["unit"] })}>
          <option value="vezes">vezes</option>
          <option value="minutos">minutos</option>
        </select>
        <Botao type="submit">Adicionar</Botao>
      </form>
    </Painel>
  );
}

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function ConfigRotina() {
  const s = useSettings();
  return (
    <Painel titulo="Rotina">
      <h3 className="mb-2 text-sm font-semibold">Lembrete de treino na Hoje</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <label key={d} className="grid grid-cols-[5.5rem_1fr] items-center gap-2 text-sm">
            <span className="text-lapis">{DIAS[d]}</span>
            <input
              className="campo"
              placeholder="Sem lembrete"
              key={s.treinoLembrete[d] ?? ""}
              defaultValue={s.treinoLembrete[d] ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v === (s.treinoLembrete[d] ?? "")) return;
                const novo = { ...s.treinoLembrete };
                if (v) novo[d] = v;
                else delete novo[d];
                salvarSettings({ treinoLembrete: novo });
              }}
            />
          </label>
        ))}
      </div>
      <h3 className="mt-4 mb-2 text-sm font-semibold">Áreas do trabalho</h3>
      <input
        aria-label="Áreas do trabalho, separadas por vírgula"
        className="campo"
        key={s.workAreas.join(",")}
        defaultValue={s.workAreas.join(", ")}
        onBlur={(e) => {
          const areas = e.target.value
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean);
          if (areas.join(",") !== s.workAreas.join(",")) salvarSettings({ workAreas: areas });
        }}
      />
      <p className="mt-1 text-xs text-lapis">Separe por vírgula.</p>
    </Painel>
  );
}
