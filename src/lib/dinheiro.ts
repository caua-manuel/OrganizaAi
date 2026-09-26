/* Dinheiro é sempre inteiro em centavos. Float (0,1 + 0,2) erra
   centavos; inteiro nunca erra na soma. */
import type { Cents } from "../db/types";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarReais(c: Cents): string {
  /* Intl usa espaço não separável depois de "R$"; trocamos por espaço
     comum para o texto ser previsível em testes e ao copiar. */
  return brl.format(c / 100).replace(/ /g, " ");
}

/* Versão sem sinal, para "R$ 80,00 de R$ 150,00" */
export const reais = (c: Cents) => formatarReais(Math.abs(c));

/* Lê o que a pessoa digitou ("45,90", "1.234,56", "12", "-3,5") e
   devolve centavos. Retorna null se não for número. */
export function lerReais(texto: string): Cents | null {
  const limpo = texto.replace(/R\$|\s/g, "").trim();
  if (!limpo) return null;
  let normal = limpo;
  if (limpo.includes(",")) {
    normal = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(limpo)) {
    normal = limpo.replace(/\./g, "");
  }
  if (!/^-?\d+(\.\d+)?$/.test(normal)) return null;
  return Math.round(Number(normal) * 100);
}

export const somar = (xs: Cents[]) => xs.reduce((a, b) => a + b, 0);
