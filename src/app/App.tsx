/* Rotas do app: cada endereço (/, /financas, …) mostra uma tela dentro
   do Layout. Aqui também moram o painel de captura e o atalho de
   teclado que o abre de qualquer tela. */
import { useEffect, useState } from "react";
import { createBrowserRouter, Navigate, RouterProvider, useRouteError } from "react-router";
import { Layout } from "./Layout";
import { Configuracoes } from "../features/configuracoes/Configuracoes";
import { Hoje } from "../features/hoje/Hoje";
import { Captura } from "../features/captura/Captura";
import { Financas } from "../features/financas/Financas";
import { Importacao } from "../features/financas/Importacao";
import { Saude } from "../features/saude/Saude";
import { Projetos } from "../features/projetos/Projetos";
import { ProjetoDetalhe } from "../features/projetos/ProjetoDetalhe";
import { Estudos } from "../features/estudos/Estudos";
import { Revisao } from "../features/revisao/Revisao";
import { BoasVindas } from "../features/onboarding/BoasVindas";
import { Trabalho } from "../features/trabalho/Trabalho";
import { Tarefas } from "../features/tarefas/Tarefas";
import { ToastProvider } from "../ui/Toast";

/* Se uma tela quebrar, mostra isto em vez da página de erro do
   React Router. Os dados continuam salvos no navegador. */
function ErroTela() {
  const erro = useRouteError();
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="mb-2 text-2xl font-semibold">Algo deu errado nesta tela</h1>
      <p className="mb-4 text-lapis">Seus dados continuam salvos. Tente voltar para a Hoje.</p>
      <pre className="mb-4 overflow-auto rounded-lg bg-folha p-3 text-xs text-lapis">{String((erro as Error)?.message ?? erro)}</pre>
      <a href="/" className="rounded-[10px] bg-grafite px-3.5 py-2 text-sm font-medium text-papel">
        Ir para Hoje
      </a>
    </main>
  );
}

/* true quando a pessoa está digitando: aí "N" é letra, não atalho */
const digitando = (el: EventTarget | null) => {
  const e = el as HTMLElement | null;
  return !!e && (["INPUT", "TEXTAREA", "SELECT"].includes(e.tagName) || e.isContentEditable);
};

export function App() {
  const [captura, setCaptura] = useState(false);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const ctrlK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
      const n = e.key.toLowerCase() === "n" && !e.ctrlKey && !e.metaKey && !e.altKey && !digitando(e.target);
      if (ctrlK || (n && !captura)) {
        e.preventDefault();
        setCaptura(true);
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [captura]);

  const [router] = useState(() =>
    createBrowserRouter([
      {
        path: "/",
        element: <Layout onCapturar={() => setCaptura(true)} />,
        errorElement: <ErroTela />,
        children: [
          { index: true, element: <Hoje /> },
          { path: "financas", element: <Financas /> },
          { path: "financas/importar", element: <Importacao /> },
          { path: "tarefas", element: <Tarefas /> },
          { path: "trabalho", element: <Trabalho /> },
          { path: "projetos", element: <Projetos /> },
          { path: "projetos/:id", element: <ProjetoDetalhe /> },
          { path: "estudos", element: <Estudos /> },
          { path: "saude", element: <Saude /> },
          { path: "revisao", element: <Revisao /> },
          { path: "boas-vindas", element: <BoasVindas /> },
          { path: "configuracoes", element: <Configuracoes /> },
          { path: "*", element: <Navigate to="/" replace /> },
        ],
      },
    ]),
  );

  return (
    <ToastProvider>
      <RouterProvider router={router} />
      <Captura aberta={captura} onFechar={() => setCaptura(false)} />
    </ToastProvider>
  );
}
