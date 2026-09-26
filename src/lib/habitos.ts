/* Hábitos com meta SEMANAL (seção 7 do BRIEFING). Funções puras.
   Um hábito soma seus registros manuais (HabitLog) e, se tiver `link`,
   também os registros automáticos: treino de academia conta para o
   hábito "Academia", sessão de foco em projeto para "Foco em projeto". */
import type { FocusSession, Habit, HabitLog, ISODate, Pillar, Workout } from "../db/types";
import { dentro, semanaAtual, somarDias } from "./datas";
import type { Semana } from "./datas";

export interface DadosHabitos {
  logs: HabitLog[];
  workouts: Workout[];
  focus: FocusSession[];
}

export function valorDoHabito(h: Habit, semana: Semana, d: DadosHabitos): number {
  let v = d.logs.filter((l) => l.habitId === h.id && dentro(l.date, semana)).reduce((s, l) => s + l.amount, 0);
  if (h.link?.startsWith("treino:")) {
    const tipo = h.link.slice(7);
    v += d.workouts.filter((w) => w.type === tipo && dentro(w.date, semana)).length;
  } else if (h.link?.startsWith("foco:")) {
    const pilar = h.link.slice(5);
    v += d.focus.filter((f) => f.pillar === pilar && dentro(f.date, semana)).reduce((s, f) => s + f.minutes, 0);
  }
  return v;
}

/* pct vai de 0 a 1 (para a barra); `valor` é o real, pode passar da meta */
export function progressoHabito(h: Habit, semana: Semana, d: DadosHabitos) {
  const valor = valorDoHabito(h, semana, d);
  const meta = h.weeklyTarget;
  return { valor, meta, pct: meta > 0 ? Math.min(1, valor / meta) : 0, bateu: meta > 0 && valor >= meta };
}

const todosBateram = (hs: Habit[], s: Semana, d: DadosHabitos) => hs.length > 0 && hs.every((h) => progressoHabito(h, s, d).bateu);

/* Sequência de SEMANAS seguidas batendo todas as metas dos hábitos
   dados. A semana atual só conta se já foi cumprida — uma semana em
   andamento não quebra a sequência. Usa as metas atuais. */
export function semanasSeguidas(hs: Habit[], d: DadosHabitos, hoje: ISODate): number {
  const atual = semanaAtual(hoje);
  let n = todosBateram(hs, atual, d) ? 1 : 0;
  let s = semanaAtual(somarDias(atual.inicio, -1));
  for (let i = 0; i < 520 && todosBateram(hs, s, d); i++) {
    n++;
    s = semanaAtual(somarDias(s.inicio, -1));
  }
  return n;
}

/* Depois de 3 semanas FECHADAS seguidas cumpridas, sugere subir a meta
   de treino um passo, até o objetivo (academia 4×, jiu-jitsu 2×). */
export const OBJETIVO_TREINO: Record<string, number> = { "treino:academia": 4, "treino:jiujitsu": 2 };

export function sugestoesDeMeta(hs: Habit[], d: DadosHabitos, hoje: ISODate) {
  const treinos = hs.filter((h) => h.active && h.link && OBJETIVO_TREINO[h.link]);
  const ultima = semanaAtual(somarDias(semanaAtual(hoje).inicio, -1));
  const tres = [0, 1, 2].map((i) => semanaAtual(somarDias(ultima.inicio, -7 * i)));
  if (!tres.every((s) => todosBateram(treinos, s, d))) return [];
  return treinos
    .filter((h) => h.weeklyTarget < OBJETIVO_TREINO[h.link!])
    .map((h) => ({ habito: h, novaMeta: h.weeklyTarget + 1 }));
}

/* % médio das metas semanais de um pilar (para a Revisão semanal). */
export function pctDoPilar(pilar: Pillar, hs: Habit[], semana: Semana, d: DadosHabitos): number | null {
  const doPilar = hs.filter((h) => h.active && h.pillar === pilar);
  if (!doPilar.length) return null;
  return doPilar.reduce((s, h) => s + progressoHabito(h, semana, d).pct, 0) / doPilar.length;
}
