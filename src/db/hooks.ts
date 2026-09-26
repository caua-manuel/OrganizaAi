/* Hooks de leitura reativa: quando o banco muda, a tela atualiza
   sozinha (é o useLiveQuery do Dexie que faz isso). */
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { settingsPadrao } from "./seed";
import type { Settings } from "./types";

/* Enquanto o banco carrega, devolve os padrões para a tela não piscar. */
export function useSettings(): Settings {
  return useLiveQuery(() => db.settings.get("app"), []) ?? settingsPadrao();
}

export async function salvarSettings(mudanca: Partial<Omit<Settings, "id">>) {
  const atual = (await db.settings.get("app")) ?? settingsPadrao();
  await db.settings.put({ ...atual, ...mudanca });
}

export function useCategorias() {
  return useLiveQuery(() => db.categories.orderBy("name").toArray(), []) ?? [];
}
