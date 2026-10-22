import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type TextoRecente = { texto: string; quando: string; nota?: number }; // nota: só nos comentários de nota baixa
export type PerguntaTexto = {
  id: string;
  texto: string;
  tipo: "texto" | "nota"; // "nota" = comentários "onde podemos melhorar" escritos junto da nota
  total: number; // quantas pessoas escreveram no período
  recentes: TextoRecente[]; // as mais novas primeiro
};

const POR_PERGUNTA = 5;
const LIMITE_BUSCA = 1000;

// Respostas escritas do período, agrupadas por pergunta: as de texto livre e, nas de nota, os comentários
// que o cliente escreveu ao dar nota baixa (só aparecem as perguntas de nota que têm algum comentário). Usa o cliente do usuário logado,
// então a RLS garante que só vêm textos de pesquisas da própria empresa. Descartadas ficam de fora.
// `inicio` é a data AAAA-MM-DD (horário de Brasília) que vem do painel; o Brasil não tem horário de verão.
// Devolve null se a consulta falhar, para a página mostrar um aviso só neste bloco.
export async function buscarTextosRecentes(
  supabase: SupabaseClient<Database>,
  pesquisaId: string,
  inicio: string,
): Promise<PerguntaTexto[] | null> {
  const { data: perguntas, error: erroPerguntas } = await supabase
    .from("perguntas")
    .select("id, texto, ordem, tipo")
    .eq("pesquisa_id", pesquisaId)
    .in("tipo", ["texto", "nota"])
    .eq("arquivada", false)
    .order("ordem");
  if (erroPerguntas || !perguntas) return null;
  if (perguntas.length === 0) return [];

  const { data: itens, error } = await supabase
    .from("respostas_itens")
    .select("pergunta_id, valor_texto, valor_nota, respostas!inner(created_at, descartada)")
    .in(
      "pergunta_id",
      perguntas.map((p) => p.id),
    )
    .not("valor_texto", "is", null)
    .eq("respostas.descartada", false)
    .gte("respostas.created_at", `${inicio}T00:00:00-03:00`)
    .order("created_at", { referencedTable: "respostas", ascending: false })
    .limit(LIMITE_BUSCA);
  if (error || !itens) return null;

  return perguntas.map((p) => {
    const dela = itens
      .filter((i) => i.pergunta_id === p.id && i.valor_texto && i.valor_texto.trim() !== "")
      .map((i) => ({ texto: i.valor_texto as string, quando: i.respostas.created_at, ...(i.valor_nota !== null ? { nota: i.valor_nota } : {}) }))
      .sort((a, b) => b.quando.localeCompare(a.quando));
    return { id: p.id, texto: p.texto, tipo: p.tipo as "texto" | "nota", total: dela.length, recentes: dela.slice(0, POR_PERGUNTA) };
  }).filter((p) => p.tipo === "texto" || p.total > 0);
}
