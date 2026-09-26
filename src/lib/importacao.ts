/* Leitura de extrato bancário (CSV ou OFX). Aqui só transformamos
   texto em linhas {data, valor, descrição}; decidir categoria e
   descartar duplicadas fica para a tela de importação. */
import Papa from "papaparse";
import type { Cents, ISODate, ImportMapping } from "../db/types";
import { lerReais } from "./dinheiro";

export interface LinhaExtrato {
  date: ISODate;
  amount: Cents;
  description: string;
  /* número da linha no arquivo, para a pessoa achar a origem */
  origem: number;
}

export interface Problema {
  origem: number;
  motivo: string;
}

export const FORMATOS_DATA = ["DD/MM/YYYY", "YYYY-MM-DD", "DD/MM/YY", "MM/DD/YYYY"] as const;

/* ── CSV ──────────────────────────────────────────────────── */
export function lerCSV(texto: string) {
  const r = Papa.parse<Record<string, string>>(texto.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  return { colunas: r.meta.fields ?? [], linhas: r.data };
}

/* Chuta quais colunas são data, valor e descrição pelo nome. A
   pessoa confere e corrige na tela antes de importar. */
export function adivinharColunas(colunas: string[]) {
  const acha = (...pistas: string[]) =>
    colunas.find((c) => pistas.some((p) => c.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").includes(p))) ?? "";
  return {
    dateColumn: acha("data", "date", "dt"),
    amountColumn: acha("valor", "amount", "quantia", "value", "montante"),
    descriptionColumn: acha("descri", "historico", "title", "memo", "estabelecimento", "lancamento"),
  };
}

export function lerData(texto: string, formato: string): ISODate | null {
  const t = texto.trim();
  let d: string, m: string, a: string;
  const partes = t.split(/[/\-.]/);
  if (partes.length !== 3) return null;
  switch (formato) {
    case "YYYY-MM-DD":
      [a, m, d] = partes;
      break;
    case "MM/DD/YYYY":
      [m, d, a] = partes;
      break;
    case "DD/MM/YY":
      [d, m, a] = partes;
      a = a.length === 2 ? `20${a}` : a;
      break;
    default:
      [d, m, a] = partes;
  }
  a = a.slice(0, 4);
  const dia = Number(d),
    mes = Number(m),
    ano = Number(a);
  if (!ano || mes < 1 || mes > 12 || dia < 1 || dia > 31 || a.length !== 4) return null;
  return `${a}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/* Aceita "1.234,56", "-45.90", "R$ 12", "1,234.56" e "(45,90)". */
export function lerValor(texto: string): Cents | null {
  let t = texto.trim().replace(/−/g, "-");
  let negativo = false;
  if (/^\(.*\)$/.test(t)) {
    negativo = true;
    t = t.slice(1, -1);
  }
  /* formato americano: vírgula de milhar e ponto decimal */
  if (/^-?[\d,]+\.\d{1,2}$/.test(t.replace(/R\$|\s/g, "")) && t.includes(",")) t = t.replace(/,/g, "");
  const v = lerReais(t);
  if (v == null) return null;
  return negativo ? -Math.abs(v) : v;
}

export function aplicarMapeamento(
  linhas: Record<string, string>[],
  map: Pick<ImportMapping, "dateColumn" | "dateFormat" | "amountColumn" | "descriptionColumn" | "invertSign">,
) {
  const ok: LinhaExtrato[] = [];
  const problemas: Problema[] = [];
  linhas.forEach((l, i) => {
    const origem = i + 2; // +1 do cabeçalho, +1 porque planilha conta do 1
    const date = lerData(l[map.dateColumn] ?? "", map.dateFormat);
    const valor = lerValor(l[map.amountColumn] ?? "");
    const description = (l[map.descriptionColumn] ?? "").trim();
    if (!date) return problemas.push({ origem, motivo: `data não reconhecida: "${l[map.dateColumn] ?? ""}"` });
    if (valor == null) return problemas.push({ origem, motivo: `valor não reconhecido: "${l[map.amountColumn] ?? ""}"` });
    if (valor === 0) return problemas.push({ origem, motivo: "valor zero" });
    ok.push({ date, amount: map.invertSign ? -valor : valor, description: description || "(sem descrição)", origem });
  });
  return { ok, problemas };
}

/* ── OFX ──────────────────────────────────────────────────────
   OFX é um formato padrão dos bancos: cada lançamento fica num bloco
   <STMTTRN> com DTPOSTED (data), TRNAMT (valor com ponto) e
   MEMO/NAME (descrição). As tags muitas vezes não fecham. */
export function lerOFX(texto: string) {
  const ok: LinhaExtrato[] = [];
  const problemas: Problema[] = [];
  const blocos = texto.split(/<STMTTRN>/i).slice(1);
  const campo = (bloco: string, tag: string) => bloco.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"))?.[1]?.trim() ?? "";
  blocos.forEach((bloco, i) => {
    const origem = i + 1;
    const dt = campo(bloco, "DTPOSTED");
    const date = /^\d{8}/.test(dt) ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}` : null;
    const bruto = campo(bloco, "TRNAMT").replace(",", ".");
    const amount = /^-?\d+(\.\d+)?$/.test(bruto) ? Math.round(Number(bruto) * 100) : null;
    const description = campo(bloco, "MEMO") || campo(bloco, "NAME") || "(sem descrição)";
    if (!date) return problemas.push({ origem, motivo: "lançamento sem data" });
    if (amount == null || amount === 0) return problemas.push({ origem, motivo: "lançamento sem valor" });
    ok.push({ date, amount, description, origem });
  });
  return { ok, problemas };
}

export const pareceOFX = (texto: string) => /<OFX>|OFXHEADER/i.test(texto.slice(0, 2000));
