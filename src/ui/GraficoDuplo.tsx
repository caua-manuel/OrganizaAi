/* Barras agrupadas de DUAS séries (ex.: estudo × projetos por semana).
   Legenda sempre visível com os nomes, para a cor não ser a única pista;
   dica ao passar o mouse com os dois valores. */
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface Serie {
  chave: string;
  nome: string;
  cor: string;
}

export function GraficoDuplo({
  dados,
  series,
  formatar = (v) => String(v),
  titulo,
  altura = 190,
}: {
  dados: ({ rotulo: string; detalhe?: string } & Record<string, number | string | undefined>)[];
  series: [Serie, Serie];
  formatar?: (v: number) => string;
  titulo: string;
  altura?: number;
}) {
  return (
    <figure className="m-0">
      <div role="img" aria-label={titulo} style={{ height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke="var(--cor-linha)" />
            <XAxis dataKey="rotulo" tickLine={false} axisLine={{ stroke: "var(--cor-linha)" }} tick={{ fill: "var(--cor-lapis)", fontSize: 11 }} />
            <YAxis width={48} tickLine={false} axisLine={false} tick={{ fill: "var(--cor-lapis)", fontSize: 11 }} tickFormatter={(v: number) => formatar(v)} allowDecimals={false} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 12, color: "var(--cor-lapis)", paddingBottom: 6 }}
              formatter={(v) => <span style={{ color: "var(--cor-grafite)" }}>{v}</span>}
            />
            <Tooltip
              cursor={{ fill: "var(--cor-linha)", opacity: 0.5 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as { rotulo: string; detalhe?: string } & Record<string, number>;
                return (
                  <div className="rounded-lg border border-linha bg-folha px-2.5 py-1.5 text-xs shadow-md">
                    <div className="mb-0.5 text-lapis">{p.detalhe ?? p.rotulo}</div>
                    {series.map((s) => (
                      <div key={s.chave} className="flex items-center gap-1.5">
                        <span className="size-2 rounded-sm" style={{ background: s.cor }} />
                        <span className="text-grafite">{s.nome}</span>
                        <span className="num ml-auto pl-3 font-semibold text-grafite">{formatar(p[s.chave] ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            {series.map((s) => (
              <Bar key={s.chave} dataKey={s.chave} name={s.nome} fill={s.cor} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{titulo}</caption>
        <thead>
          <tr>
            <th scope="col">Período</th>
            {series.map((s) => (
              <th key={s.chave} scope="col">
                {s.nome}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.map((d) => (
            <tr key={d.rotulo}>
              <th scope="row">{d.detalhe ?? d.rotulo}</th>
              {series.map((s) => (
                <td key={s.chave}>{formatar(Number(d[s.chave] ?? 0))}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
