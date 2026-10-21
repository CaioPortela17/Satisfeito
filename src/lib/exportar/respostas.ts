import { formatarDataHora } from "@/lib/respostas/lista";
import type { Celula } from "./csv";

export type PerguntaExportar = { id: string; texto: string; tipo: string; ordem: number; arquivada: boolean };
export type ItemExportar = { pergunta_id: string; valor_nota: number | null; valor_texto: string | null };
export type RespostaExportar = { id: string; created_at: string; descartada: boolean; respostas_itens: ItemExportar[] };

export type AbaExportar = "todas" | "suspeitas" | "descartadas";

function situacao(r: RespostaExportar, suspeitos: Set<string>): string {
  if (r.descartada) return "Descartada";
  return suspeitos.has(r.id) ? "Suspeita" : "Normal";
}

// Média das notas do envio com uma casa e vírgula ("8,5"); sem nota, vazio
function mediaDasNotas(itens: ItemExportar[]): string {
  const notas = itens.map((i) => i.valor_nota).filter((n): n is number => n !== null);
  if (notas.length === 0) return "";
  return (Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10).toFixed(1).replace(".", ",");
}

// Uma linha por resposta e uma coluna por pergunta (as arquivadas também, porque têm histórico).
export function montarLinhasRespostas(
  perguntas: PerguntaExportar[],
  respostas: RespostaExportar[],
  suspeitos: Set<string>,
  aba: AbaExportar,
): Celula[][] {
  // Perguntas antigas de funcionário ("Quem te atendeu?") ficam fora da planilha
  const ordenadas = perguntas.filter((p) => p.tipo !== "funcionario").sort((a, b) => a.ordem - b.ordem);
  const cabecalho: Celula[] = [
    "Data e hora",
    "Situação",
    "Média das notas",
    ...ordenadas.map((p) => (p.arquivada ? `${p.texto} (arquivada)` : p.texto)),
  ];

  const filtradas = respostas.filter((r) => {
    if (aba === "descartadas") return r.descartada;
    if (aba === "suspeitas") return !r.descartada && suspeitos.has(r.id);
    return true;
  });

  const linhas = filtradas.map((r): Celula[] => {
    const porPergunta = new Map(r.respostas_itens.map((i) => [i.pergunta_id, i]));
    const celulas = ordenadas.map((p): Celula => {
      const item = porPergunta.get(p.id);
      if (!item) return "";
      if (p.tipo === "nota") return item.valor_nota;
      return item.valor_texto;
    });
    return [formatarDataHora(r.created_at), situacao(r, suspeitos), mediaDasNotas(r.respostas_itens), ...celulas];
  });

  return [cabecalho, ...linhas];
}
