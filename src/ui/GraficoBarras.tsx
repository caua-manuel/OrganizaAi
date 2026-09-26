/* Gráfico de barras de UMA série (uma cor, a do pilar). Barras finas
   com ponta arredondada, grade discreta, dica ao passar o mouse e uma
   tabela escondida para leitores de tela.
   `referencia` desenha uma linha tracejada (meta ou limite). */
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface PontoBarra {
  rotulo: string;
  valor: number;
  /* texto longo para a dica, ex.: "semana de 21 set" */
  detalhe?: string;
}

export function GraficoBarras({
  dados,
  cor,
  formatar = (v) => String(v),
  referencia,
  titulo,
  altura = 170,
}: {
  dados: PontoBarra[];
  cor: string;
  formatar?: (v: number) => string;
  referencia?: { valor: number; rotulo: string };
  titulo: string;
  altura?: number;
}) {
  return (
    <figure className="m-0">
      <div role="img" aria-label={titulo} style={{ height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 12, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--cor-linha)" />
            <XAxis
              dataKey="rotulo"
              tickLine={false}
              axisLine={{ stroke: "var(--cor-linha)" }}
              tick={{ fill: "var(--cor-lapis)", fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              width={56}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--cor-lapis)", fontSize: 11 }}
              tickFormatter={(v: number) => formatar(v)}
              allowDecimals={false}
              /* o topo do eixo inclui a linha de referência, senão ela some */
              domain={[0, (max: number) => Math.ceil(Math.max(max, (referencia?.valor ?? 0) * 1.1))]}
            />
            <Tooltip
              cursor={{ fill: "var(--cor-linha)", opacity: 0.5 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as PontoBarra;
                return (
                  <div className="rounded-lg border border-linha bg-folha px-2.5 py-1.5 text-xs shadow-md">
                    <div className="text-lapis">{p.detalhe ?? p.rotulo}</div>
                    <div className="num text-sm font-semibold text-grafite">{formatar(p.valor)}</div>
                  </div>
                );
              }}
            />
            {referencia && referencia.valor > 0 && (
              <ReferenceLine
                y={referencia.valor}
                stroke="var(--cor-lapis)"
                strokeDasharray="4 4"
                label={{ value: referencia.rotulo, position: "insideTopRight", fill: "var(--cor-lapis)", fontSize: 11 }}
              />
            )}
            <Bar dataKey="valor" fill={cor} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{titulo}</caption>
        <tbody>
          {dados.map((d) => (
            <tr key={d.rotulo}>
              <th scope="row">{d.detalhe ?? d.rotulo}</th>
              <td>{formatar(d.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
