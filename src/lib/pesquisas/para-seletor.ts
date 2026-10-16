import type { createClient } from "@/lib/supabase/server";

type ClienteSupabase = Awaited<ReturnType<typeof createClient>>;

// Pesquisas da empresa, da mais recente para a mais antiga, com quantos envios cada uma tem.
// Usada pelas páginas Resultados e Respostas (o seletor de pesquisa).
// respostas(count) ignora as descartadas (o filtro em tabela embutida só limita as linhas embutidas:
// a pesquisa sem respostas continua na lista, com contagem 0).
export async function listarPesquisasParaSeletor(supabase: ClienteSupabase, empresaId: string | null | undefined) {
  if (!empresaId) return [];
  const { data } = await supabase
    .from("pesquisas")
    .select("id, titulo, slug, respostas(count)")
    .eq("empresa_id", empresaId)
    .eq("respostas.descartada", false)
    .order("created_at", { ascending: false });
  return (data ?? []).map((p) => ({
    id: p.id,
    titulo: p.titulo,
    slug: p.slug,
    respostas: p.respostas[0]?.count ?? 0,
  }));
}
