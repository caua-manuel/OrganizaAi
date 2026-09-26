import type { Base } from "../db/types";

export const novoId = () => crypto.randomUUID();
export const agora = () => new Date().toISOString();

/* Todo registro nasce com id, createdAt e updatedAt: deixa o banco
   pronto para sincronizar no futuro. */
export function comBase<T extends object>(dados: T): T & Base {
  const t = agora();
  return { id: novoId(), createdAt: t, updatedAt: t, ...dados };
}
