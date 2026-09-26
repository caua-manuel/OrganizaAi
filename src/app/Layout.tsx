/* Moldura de todas as telas: barra lateral no computador, barra
   inferior no celular, e o conteúdo da rota atual no meio (<Outlet/>). */
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import {
  BookOpen,
  Briefcase,
  CalendarCheck,
  Dumbbell,
  FolderKanban,
  MoreHorizontal,
  Plus,
  Settings as Engrenagem,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSettings } from "../db/hooks";
import { aplicarTema } from "./tema";
import { junta } from "../ui/ui";

interface Item {
  para: string;
  nome: string;
  Icone: LucideIcon;
  cor?: string;
}

const ITENS: Item[] = [
  { para: "/", nome: "Hoje", Icone: Sun },
  { para: "/financas", nome: "Finanças", Icone: Wallet, cor: "var(--pilar-financas)" },
  { para: "/trabalho", nome: "Trabalho", Icone: Briefcase, cor: "var(--pilar-trabalho)" },
  { para: "/projetos", nome: "Projetos", Icone: FolderKanban, cor: "var(--pilar-projetos)" },
  { para: "/estudos", nome: "Estudos", Icone: BookOpen, cor: "var(--pilar-estudos)" },
  { para: "/saude", nome: "Saúde", Icone: Dumbbell, cor: "var(--pilar-saude)" },
  { para: "/revisao", nome: "Revisão", Icone: CalendarCheck },
];
const CONFIG: Item = { para: "/configuracoes", nome: "Configurações", Icone: Engrenagem };

export function Layout({ onCapturar }: { onCapturar: () => void }) {
  const settings = useSettings();
  useEffect(() => aplicarTema(settings.theme), [settings.theme]);

  const [mais, setMais] = useState(false);
  const local = useLocation();
  useEffect(() => setMais(false), [local.pathname]);

  return (
    <div className="min-h-dvh md:flex">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-folha focus:p-2"
      >
        Pular para o conteúdo
      </a>

      {/* ── barra lateral (computador) ── */}
      <nav
        aria-label="Principal"
        className="sticky top-0 hidden h-dvh w-[76px] shrink-0 flex-col items-center gap-1 border-r border-linha bg-folha py-4 md:flex lg:w-[200px] lg:items-stretch lg:px-3"
      >
        <div className="mb-4 px-2 font-titulo text-lg font-bold">
          <span className="lg:hidden">O</span>
          <span className="hidden lg:inline">OrganizaAi</span>
        </div>
        {ITENS.map((i) => (
          <ItemLateral key={i.para} item={i} />
        ))}
        <button
          type="button"
          onClick={onCapturar}
          className="mt-3 flex items-center justify-center gap-2 rounded-[10px] bg-grafite px-3 py-2 text-sm font-medium text-papel hover:opacity-90"
          title="Captura rápida (N)"
        >
          <Plus size={18} aria-hidden="true" />
          <span className="hidden lg:inline">Capturar</span>
          <kbd className="ml-auto hidden rounded border border-papel/30 px-1 text-[0.6875rem] lg:inline">N</kbd>
        </button>
        <div className="mt-auto w-full">
          <ItemLateral item={CONFIG} />
        </div>
      </nav>

      {/* ── conteúdo ── */}
      <main id="conteudo" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 sm:px-6 md:pb-10 lg:px-10">
        <Outlet />
      </main>

      {/* ── barra inferior (celular) ── */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-end border-t border-linha bg-folha px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
      >
        <ItemInferior item={ITENS[0]} />
        <ItemInferior item={ITENS[1]} />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onCapturar}
            aria-label="Captura rápida"
            className="-mt-6 grid size-14 place-items-center rounded-full bg-grafite text-papel shadow-lg"
          >
            <Plus size={26} aria-hidden="true" />
          </button>
        </div>
        <ItemInferior item={ITENS[3]} />
        <button
          type="button"
          onClick={() => setMais(true)}
          className="flex flex-col items-center gap-0.5 py-1 text-[0.6875rem] text-lapis"
        >
          <MoreHorizontal size={22} aria-hidden="true" />
          Mais
        </button>
      </nav>

      {/* ── "Mais" no celular ── */}
      {mais && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Mais telas">
          <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/30" onClick={() => setMais(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-folha p-4 pb-8">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">Mais</h2>
              <button type="button" aria-label="Fechar" onClick={() => setMais(false)} className="p-1 text-lapis">
                <X size={20} />
              </button>
            </div>
            {[ITENS[2], ITENS[4], ITENS[5], ITENS[6], CONFIG].map((i) => (
              <ItemLateral key={i.para} item={i} largo />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemLateral({ item, largo }: { item: Item; largo?: boolean }) {
  const { para, nome, Icone, cor } = item;
  return (
    <NavLink
      to={para}
      end={para === "/"}
      title={nome}
      className={({ isActive }) =>
        junta(
          "relative flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm transition-colors",
          largo ? "w-full" : "justify-center lg:justify-start",
          isActive ? "bg-papel font-semibold text-grafite" : "text-lapis hover:bg-papel hover:text-grafite",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && cor && (
            <span aria-hidden="true" className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full" style={{ background: cor }} />
          )}
          <Icone size={19} aria-hidden="true" style={isActive && cor ? { color: cor } : undefined} />
          <span className={largo ? "" : "hidden lg:inline"}>{nome}</span>
        </>
      )}
    </NavLink>
  );
}

function ItemInferior({ item }: { item: Item }) {
  const { para, nome, Icone, cor } = item;
  return (
    <NavLink
      to={para}
      end={para === "/"}
      className={({ isActive }) =>
        junta("flex flex-col items-center gap-0.5 py-1 text-[0.6875rem]", isActive ? "font-semibold text-grafite" : "text-lapis")
      }
    >
      {({ isActive }) => (
        <>
          <Icone size={22} aria-hidden="true" style={isActive && cor ? { color: cor } : undefined} />
          {nome}
        </>
      )}
    </NavLink>
  );
}
