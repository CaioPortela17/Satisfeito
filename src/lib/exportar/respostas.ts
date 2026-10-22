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
function mediaDasNotas(notas: number[]): string {
  if (notas.length === 0) return "";
  return (Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10).toFixed(1).replace(".", ",");
}

// Uma linha por resposta e uma coluna por pergunta que está valendo na pesquisa.
// Perguntas tiradas da pesquisa (arquivadas, inclusive as antigas de funcionário) não viram coluna.
// Nota baixa pode ter o comentário "onde podemos melhorar": ele ganha uma coluna ao lado da nota,
// só nas perguntas de nota em que alguém escreveu algo.
export function montarLinhasRespostas(
  perguntas: PerguntaExportar[],
  respostas: RespostaExportar[],
  suspeitos: Set<string>,
  aba: AbaExportar,
): Celula[][] {
  const atuais = perguntas.filter((p) => !p.arquivada && (p.tipo === "nota" || p.tipo === "texto")).sort((a, b) => a.ordem - b.ordem);

  const comentariosDeNota = new Set(
    respostas.flatMap((r) => r.respostas_itens.filter((i) => i.valor_nota !== null && i.valor_texto).map((i) => i.pergunta_id)),
  );

  type Coluna = { titulo: string; valor: (porPergunta: Map<string, ItemExportar>) => Celula };
  const colunas: Coluna[] = atuais.flatMap((p): Coluna[] => {
    if (p.tipo === "texto") return [{ titulo: p.texto, valor: (m) => m.get(p.id)?.valor_texto ?? "" }];
    const nota: Coluna = { titulo: p.texto, valor: (m) => m.get(p.id)?.valor_nota ?? "" };
    if (!comentariosDeNota.has(p.id)) return [nota];
    return [nota, { titulo: `${p.texto} (comentário)`, valor: (m) => m.get(p.id)?.valor_texto ?? "" }];
  });

  const idsDeNota = new Set(atuais.filter((p) => p.tipo === "nota").map((p) => p.id));
  const cabecalho: Celula[] = ["Data e hora", "Situação", "Média das notas", ...colunas.map((c) => c.titulo)];

  const filtradas = respostas.filter((r) => {
    if (aba === "descartadas") return r.descartada;
    if (aba === "suspeitas") return !r.descartada && suspeitos.has(r.id);
    return true;
  });

  const linhas = filtradas.map((r): Celula[] => {
    const porPergunta = new Map(r.respostas_itens.map((i) => [i.pergunta_id, i]));
    // A média confere com as colunas da planilha (só as perguntas de nota que estão valendo)
    const notas = r.respostas_itens.filter((i) => idsDeNota.has(i.pergunta_id) && i.valor_nota !== null).map((i) => i.valor_nota as number);
    return [formatarDataHora(r.created_at), situacao(r, suspeitos), mediaDasNotas(notas), ...colunas.map((c) => c.valor(porPergunta))];
  });

  return [cabecalho, ...linhas];
}
