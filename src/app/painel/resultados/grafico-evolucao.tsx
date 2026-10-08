"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatarMedia, rotuloDia } from "@/lib/resultados/apresentacao";
import type { PontoEvolucao } from "@/lib/resultados/tipos";

const COR_LINHA = "#2a1f2d"; // ameixa
const COR_PONTO = "#14b8a6"; // menta
const COR_TEXTO_EIXO = "#6b5f6e"; // mesmo valor do --muted-foreground (contraste de uns 6:1 sobre branco)
const COR_GRADE = "#e9dcd6"; // mesmo valor do --border

// Nota média por dia. Para quem usa leitor de tela, o gráfico (que é só imagem)
// vem acompanhado de uma tabela escondida com os mesmos números.
export function GraficoEvolucao({ dados }: { dados: PontoEvolucao[] }) {
  if (dados.length === 0) {
    return <p className="text-muted-foreground">Ainda não há notas nos últimos 30 dias.</p>;
  }

  const primeiro = dados[0];
  const ultimo = dados[dados.length - 1];
  const resumo = `Nota média por dia, de ${rotuloDia(primeiro.dia)} a ${rotuloDia(ultimo.dia)}. A última média foi ${formatarMedia(ultimo.media)}.`;
  const pontos = dados.map((d) => ({ ...d, rotulo: rotuloDia(d.dia) }));

  return (
    <div>
      <div role="img" aria-label={resumo} className="h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pontos} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid stroke={COR_GRADE} vertical={false} />
            <XAxis dataKey="rotulo" tick={{ fontSize: 12, fill: COR_TEXTO_EIXO }} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis domain={[1, 10]} ticks={[2, 4, 6, 8, 10]} tick={{ fontSize: 12, fill: COR_TEXTO_EIXO }} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              formatter={(valor) => [formatarMedia(Number(valor)), "Nota média"]}
              labelFormatter={(rotulo) => `Dia ${rotulo}`}
              contentStyle={{ borderRadius: 16, border: `1px solid ${COR_GRADE}` }}
            />
            <Line
              type="monotone"
              dataKey="media"
              stroke={COR_LINHA}
              strokeWidth={3}
              dot={{ r: 4, fill: COR_PONTO, stroke: COR_LINHA, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{resumo}</caption>
        <thead>
          <tr><th>Dia</th><th>Nota média</th><th>Respostas com nota</th></tr>
        </thead>
        <tbody>
          {dados.map((d) => (
            <tr key={d.dia}>
              <td>{rotuloDia(d.dia)}</td>
              <td>{formatarMedia(d.media)}</td>
              <td>{d.respostas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
