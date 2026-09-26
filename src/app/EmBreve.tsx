/* Tela provisória para pilares ainda não construídos. */
import { Cabecalho, Painel, Vazio } from "../ui/ui";
import type { Pillar } from "../db/types";

export function EmBreve({ titulo, pilar, texto }: { titulo: string; pilar?: Pillar; texto: string }) {
  return (
    <>
      <Cabecalho titulo={titulo} />
      <Painel pilar={pilar}>
        <Vazio>{texto}</Vazio>
      </Painel>
    </>
  );
}
