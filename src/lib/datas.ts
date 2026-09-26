/* Datas do app. Semana = segunda a domingo, fuso America/Sao_Paulo.
   Guardamos dias como texto 'YYYY-MM-DD' para comparar e ordenar sem
   surpresas de fuso horário. */
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ISODate } from "../db/types";

export const FUSO = "America/Sao_Paulo";

/* "Hoje" no fuso de São Paulo, independente do fuso do computador. */
export function hojeISO(agora: Date = new Date()): ISODate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

/* Converte 'YYYY-MM-DD' em Date ao meio-dia local: meio-dia nunca
   vira outro dia por causa de horário de verão ou fuso. */
export const deISO = (d: ISODate) => parseISO(`${d}T12:00:00`);
export const paraISO = (d: Date): ISODate => format(d, "yyyy-MM-dd");

export const somarDias = (d: ISODate, n: number) => paraISO(addDays(deISO(d), n));
export const somarMeses = (d: ISODate, n: number) => paraISO(addMonths(deISO(d), n));
export const diasEntre = (a: ISODate, b: ISODate) => differenceInCalendarDays(deISO(b), deISO(a));

export interface Semana {
  inicio: ISODate; // segunda
  fim: ISODate; // domingo
}

export function semanaAtual(data: ISODate = hojeISO()): Semana {
  const inicio = paraISO(startOfWeek(deISO(data), { weekStartsOn: 1 }));
  return { inicio, fim: somarDias(inicio, 6) };
}

export const dentro = (d: ISODate, s: { inicio: ISODate; fim: ISODate }) => d >= s.inicio && d <= s.fim;

/* 'YYYY-MM' */
export const mesDe = (d: ISODate) => d.slice(0, 7);

export function limitesDoMes(mes: string) {
  const d = deISO(`${mes}-01`);
  return { inicio: paraISO(startOfMonth(d)), fim: paraISO(endOfMonth(d)) };
}

export const mesAnterior = (mes: string, n = 1) => mesDe(somarMeses(`${mes}-01`, -n));

/* Últimas N semanas, da mais antiga para a atual. */
export function ultimasSemanas(n: number, ate: ISODate = hojeISO()): Semana[] {
  const atual = semanaAtual(ate);
  return Array.from({ length: n }, (_, i) => semanaAtual(somarDias(atual.inicio, -7 * (n - 1 - i))));
}

export const fmtData = (d: ISODate, padrao = "d 'de' MMM") => format(deISO(d), padrao, { locale: ptBR });
export const fmtMes = (mes: string) => format(deISO(`${mes}-01`), "MMMM 'de' yyyy", { locale: ptBR });
export const fmtMesCurto = (mes: string) => format(deISO(`${mes}-01`), "MMM/yy", { locale: ptBR });
/* 0 = domingo … 6 = sábado */
export const diaDaSemana = (d: ISODate) => deISO(d).getDay();
export const nomeDiaSemana = (d: ISODate) => format(deISO(d), "EEEE", { locale: ptBR });
