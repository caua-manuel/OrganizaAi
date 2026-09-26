/* Rotas do app: cada endereço (/, /financas, …) mostra uma tela dentro
   do Layout. */
import { useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Layout } from "./Layout";
import { EmBreve } from "./EmBreve";
import { Configuracoes } from "../features/configuracoes/Configuracoes";

export function App() {
  const [, setCaptura] = useState(false);

  const [router] = useState(() =>
    createBrowserRouter([
      {
        path: "/",
        element: <Layout onCapturar={() => setCaptura(true)} />,
        children: [
          { index: true, element: <EmBreve titulo="Hoje" texto="Suas tarefas do dia e ideias vão aparecer aqui." /> },
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

  return <RouterProvider router={router} />;
}
