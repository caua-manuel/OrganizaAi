/* Rotas do app: cada endereço (/, /financas, …) mostra uma tela dentro
   do Layout. Aqui também moram o painel de captura e o atalho de
   teclado que o abre de qualquer tela. */
import { useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Layout } from "./Layout";
import { EmBreve } from "./EmBreve";
import { Configuracoes } from "../features/configuracoes/Configuracoes";
import { Hoje } from "../features/hoje/Hoje";
import { Captura } from "../features/captura/Captura";
import { ToastProvider } from "../ui/Toast";

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
        children: [
          { index: true, element: <Hoje /> },
          { path: "financas", element: <EmBreve titulo="Finanças" pilar="financas" texto="Em construção." /> },
          { path: "trabalho", element: <EmBreve titulo="Trabalho" pilar="trabalho" texto="Em construção." /> },
          { path: "projetos", element: <EmBreve titulo="Projetos" pilar="projetos" texto="Em construção." /> },
          { path: "estudos", element: <EmBreve titulo="Estudos" pilar="estudos" texto="Em construção." /> },
          { path: "saude", element: <EmBreve titulo="Saúde" pilar="saude" texto="Em construção." /> },
          { path: "revisao", element: <EmBreve titulo="Revisão" texto="Em construção." /> },
          { path: "configuracoes", element: <Configuracoes /> },
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
