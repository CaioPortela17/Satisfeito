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
// Número (milissegundos) -> "DD/MM", no mesmo fuso em que o número foi criado
function rotuloDeTempo(t: number): string {
  const d = new Date(t);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${String(d.getDate()).padStart(2, "0")}/${mes}`;
}

// Com um único dia, min == max e o eixo não teria largura: abrimos um dia para cada lado
const UM_DIA = 24 * 60 * 60 * 1000;
function dominioTempo(primeiro: number, ultimo: number): [number, number] {
  return primeiro === ultimo ? [primeiro - UM_DIA, ultimo + UM_DIA] : [primeiro, ultimo];
}

export function GraficoEvolucao({ dados }: { dados: PontoEvolucao[] }) {
  if (dados.length === 0) {
    return <p className="text-muted-foreground">Ainda não há notas nos últimos 30 dias.</p>;
  }

  const primeiro = dados[0];
  const ultimo = dados[dados.length - 1];
  const resumo = `Nota média por dia, de ${rotuloDia(primeiro.dia)} a ${rotuloDia(ultimo.dia)}. A última média foi ${formatarMedia(ultimo.media)}.`;
  // t = meio-dia do dia, em milissegundos: o eixo vira uma linha do tempo de verdade
  // (dias sem resposta ocupam espaço), e o meio-dia evita deslocar o dia por fuso.
  const pontos = dados.map((d) => ({ ...d, t: Date.parse(`${d.dia}T12:00:00`) }));
  const dominio = dominioTempo(pontos[0].t, pontos[pontos.length - 1].t);

  return (
    <div>
      <div role="img" aria-label={resumo} className="h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pontos} accessibilityLayer={false} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid stroke={COR_GRADE} vertical={false} />
            <XAxis dataKey="t" type="number" scale="time" domain={dominio} ticks={pontos.length <= 7 ? pontos.map((p) => p.t) : undefined} tickFormatter={(t) => rotuloDeTempo(Number(t))} tick={{ fontSize: 12, fill: COR_TEXTO_EIXO }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis domain={[1, 10]} ticks={[2, 4, 6, 8, 10]} tick={{ fontSize: 12, fill: COR_TEXTO_EIXO }} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              formatter={(valor) => [formatarMedia(Number(valor)), "Nota média"]}
              labelFormatter={(t) => `Dia ${rotuloDeTempo(Number(t))}`}
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
      <div className="sr-only">
        <table>
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
    </div>
  );
}
