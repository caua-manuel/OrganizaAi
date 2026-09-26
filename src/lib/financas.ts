/* Cálculos de finanças (seção 7 do BRIEFING). Funções puras: recebem
   os dados e devolvem números, sem tocar no banco. Por isso dá para
   testar cada regra isoladamente (financas.test.ts). */
import type { Category, CategoryRule, Cents, ID, ISODate, SavingsDeposit, SavingsGoal, Settings, Transaction } from "../db/types";
import { dentro, limitesDoMes, mesAnterior, mesDe, somarMeses } from "./datas";
import type { Semana } from "./datas";
import { somar } from "./dinheiro";

const doMes = <T extends { date: ISODate }>(xs: T[], mes: string) => {
  const lim = limitesDoMes(mes);
  return xs.filter((x) => dentro(x.date, lim));
};

/* ── Resumo do mês ────────────────────────────────────────── */
export function resumoMes(mes: string, txs: Transaction[]) {
  const doMesAtual = doMes(txs, mes);
  const entradas = somar(doMesAtual.filter((t) => t.amount > 0).map((t) => t.amount));
  const saidas = -somar(doMesAtual.filter((t) => t.amount < 0).map((t) => t.amount));
  const porOrigem = new Map<string, Cents>();
  for (const t of doMesAtual) {
    if (t.amount > 0) porOrigem.set(t.source ?? "outro", (porOrigem.get(t.source ?? "outro") ?? 0) + t.amount);
  }
  return { entradas, saidas, sobra: entradas - saidas, porOrigem };
}

/* ── Meta mensal de guardar ───────────────────────────────────
   base + tudo que entrou de VoIP no mês. */
export function metaMensalPoupanca(mes: string, settings: Pick<Settings, "monthlySavingsBase">, txs: Transaction[]): Cents {
  const voip = somar(doMes(txs, mes).filter((t) => t.source === "voip" && t.amount > 0).map((t) => t.amount));
  return settings.monthlySavingsBase + voip;
}

/* Quanto foi guardado no mês, somando todas as metas (retiradas descontam). */
export const guardadoNoMes = (mes: string, deps: SavingsDeposit[]) => somar(doMes(deps, mes).map((d) => d.amount));

export const saldoMeta = (goalId: ID, deps: SavingsDeposit[]) =>
  somar(deps.filter((d) => d.goalId === goalId).map((d) => d.amount));

/* ── Gasto médio mensal ───────────────────────────────────────
   Média das saídas dos últimos 3 meses FECHADOS (o mês corrente
   ainda não acabou). Só existe se os 3 meses tiverem lançamentos:
   até lá, a reserva usa o valor manual. */
export function gastoMedioMensal(txs: Transaction[], hoje: ISODate): Cents | null {
  const atual = mesDe(hoje);
  const meses = [1, 2, 3].map((n) => mesAnterior(atual, n));
  const totais = meses.map((m) => -somar(doMes(txs, m).filter((t) => t.amount < 0).map((t) => t.amount)));
  const comDados = meses.filter((m) => doMes(txs, m).length > 0).length;
  if (comDados < 3) return null;
  return Math.round(somar(totais) / 3);
}

/* Alvo da meta: automático (N × gasto médio) quando há dados, senão
   o valor digitado. */
export function alvoDaMeta(meta: SavingsGoal, gastoMedio: Cents | null): { alvo: Cents; automatico: boolean } {
  if (meta.autoTarget && gastoMedio != null && gastoMedio > 0)
    return { alvo: meta.autoTarget.monthsOfExpenses * gastoMedio, automatico: true };
  return { alvo: meta.targetAmount, automatico: false };
}

/* ── Projeção ─────────────────────────────────────────────────
   Média dos aportes dos últimos 3 meses (incluindo o atual), contando
   só os meses desde o primeiro aporte. Data estimada = hoje + falta /
   média, em meses. */
export type Projecao =
  | { tipo: "atingida" }
  | { tipo: "sem-dados" }
  | { tipo: "estimada"; mediaMensal: Cents; meses: number; data: ISODate };

export function projecaoMeta(goalId: ID, alvo: Cents, deps: SavingsDeposit[], hoje: ISODate): Projecao {
  const meus = deps.filter((d) => d.goalId === goalId);
  const saldo = somar(meus.map((d) => d.amount));
  if (alvo > 0 && saldo >= alvo) return { tipo: "atingida" };
  if (meus.length === 0 || alvo <= 0) return { tipo: "sem-dados" };
  const primeiro = meus.map((d) => mesDe(d.date)).sort()[0];
  const atual = mesDe(hoje);
  const janela = [2, 1, 0].map((n) => mesAnterior(atual, n)).filter((m) => m >= primeiro);
  const total = somar(janela.map((m) => somar(doMes(meus, m).map((d) => d.amount))));
  const media = Math.round(total / janela.length);
  if (media <= 0) return { tipo: "sem-dados" };
  const meses = Math.ceil((alvo - saldo) / media);
  return { tipo: "estimada", mediaMensal: media, meses, data: somarMeses(hoje, meses) };
}

/* ── Gasto de uma categoria numa semana (ex.: Comer fora) ─── */
export const gastoNaSemana = (categoryId: ID, semana: Semana, txs: Transaction[]) =>
  -somar(txs.filter((t) => t.categoryId === categoryId && t.amount < 0 && dentro(t.date, semana)).map((t) => t.amount));

/* ── Gastos por categoria: mês atual × média dos 3 anteriores ── */
export function gastosPorCategoria(mes: string, txs: Transaction[], cats: Category[]) {
  const soma = (m: string, id: ID) =>
    -somar(doMes(txs, m).filter((t) => t.categoryId === id && t.amount < 0).map((t) => t.amount));
  const anteriores = [1, 2, 3].map((n) => mesAnterior(mes, n));
  const mesesComDados = anteriores.filter((m) => doMes(txs, m).some((t) => t.amount < 0));
  return cats
    .filter((c) => c.type === "saida")
    .map((c) => ({
      categoria: c,
      atual: soma(mes, c.id),
      media: mesesComDados.length
        ? Math.round(somar(mesesComDados.map((m) => soma(m, c.id))) / mesesComDados.length)
        : null,
    }))
    .filter((x) => x.atual > 0 || (x.media ?? 0) > 0)
    .sort((a, b) => b.atual - a.atual);
}

/* ── Importação: deduplicação e categorização ─────────────── */

export const normalizarDescricao = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim();

/* cyrb53: hash curto e rápido, suficiente para reconhecer a mesma
   linha de extrato importada duas vezes (não é para segurança). */
function cyrb53(texto: string, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export const importHash = (date: ISODate, amount: Cents, description: string) =>
  cyrb53(`${date}|${amount}|${normalizarDescricao(description)}`);

/* Primeira regra (pela ordem de criação) cujo texto aparece na
   descrição, sem diferenciar maiúsculas. Sem regra → null, e quem
   chama usa "Sem categoria". Devolve também a regra, para a tela
   mostrar POR QUE aquela categoria foi escolhida. */
export function categorizar(descricao: string, regras: CategoryRule[]): CategoryRule | null {
  const d = normalizarDescricao(descricao);
  const ordenadas = [...regras].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return ordenadas.find((r) => r.contains.trim() && d.includes(normalizarDescricao(r.contains))) ?? null;
}

/* Sugestão de palavra-chave para uma regra nova: a primeira palavra
   "de verdade" da descrição (ex.: "IFOOD *RESTAURANTE X" → "IFOOD"). */
const GENERICAS = new Set([
  "PIX", "COMPRA", "PAG", "PAGAMENTO", "PAGTO", "TRANSF", "TRANSFERENCIA", "TRANSFERÊNCIA", "DEB", "CRED",
  "DEBITO", "DÉBITO", "CREDITO", "CRÉDITO", "CARTAO", "CARTÃO", "VISA", "ELO", "MASTERCARD", "ENVIADO", "RECEBIDO",
]);

export function palavraChave(descricao: string) {
  const palavras = normalizarDescricao(descricao)
    .replace(/[^A-Z0-9À-Ú ]/g, " ")
    .split(" ")
    .filter((p) => p.length >= 3 && !/^\d+$/.test(p) && !GENERICAS.has(p));
  return palavras[0] ?? normalizarDescricao(descricao).slice(0, 12);
}
