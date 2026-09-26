/* O tokens.css troca as cores conforme o atributo data-tema do <html>.
   "sistema" = sem atributo, e o navegador decide pelo tema do computador. */
import type { Settings } from "../db/types";

export function aplicarTema(tema: Settings["theme"]) {
  const html = document.documentElement;
  if (tema === "sistema") html.removeAttribute("data-tema");
  else html.setAttribute("data-tema", tema);
}
