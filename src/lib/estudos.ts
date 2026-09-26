/* Faculdade: média ponderada das notas lançadas e situação da matéria.
   Funções puras (testadas em estudos.test.ts). */
import type { Assessment, ISODate, Subject } from "../db/types";
import { somarDias } from "./datas";

/* Média ponderada só das avaliações que já têm nota. Sem peso = 1. */
export function mediaMateria(subjectId: string, avaliacoes: Assessment[]): number | null {
  const comNota = avaliacoes.filter((a) => a.subjectId === subjectId && a.grade != null);
  if (!comNota.length) return null;
  const pesos = comNota.reduce((s, a) => s + (a.weight ?? 1), 0);
  if (pesos <= 0) return null;
  return comNota.reduce((s, a) => s + a.grade! * (a.weight ?? 1), 0) / pesos;
}

export function situacaoMateria(m: Subject, media: number | null): { texto: string; ok: boolean | null } {
  if (m.status === "aprovado") return { texto: "Aprovado", ok: true };
  if (m.status === "reprovado") return { texto: "Reprovado", ok: false };
  if (media == null) return { texto: "Sem notas ainda", ok: null };
  return media >= m.passingGrade
    ? { texto: "Acima da média", ok: true }
    : { texto: `Faltam ${(m.passingGrade - media).toFixed(1).replace(".", ",")} para a média`, ok: false };
}

/* Avaliações sem nota a partir de hoje, da mais próxima para a mais
   distante; `emBreve` marca as dos próximos 7 dias. */
export function proximasAvaliacoes(avaliacoes: Assessment[], hoje: ISODate) {
  const limite = somarDias(hoje, 7);
  return avaliacoes
    .filter((a) => a.grade == null && a.date >= hoje)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((a) => ({ avaliacao: a, emBreve: a.date <= limite }));
}

export const fmtNota = (n: number) => n.toFixed(1).replace(".", ",");
