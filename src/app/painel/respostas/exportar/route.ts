import type { NextRequest } from "next/server";
import { z } from "zod";
import { montarCsv } from "@/lib/exportar/csv";
import {
  montarLinhasRespostas,
  type PerguntaExportar,
  type RespostaExportar,
} from "@/lib/exportar/respostas";
import { lerAba } from "@/lib/respostas/lista";
import { createClient } from "@/lib/supabase/server";

const TAMANHO_PAGINA = 1000; // o Supabase devolve no máximo 1000 linhas por consulta
const MAX_PAGINAS = 50; // teto de segurança: 50 mil respostas por planilha

// Baixa as respostas de uma pesquisa em planilha (CSV). Só o dono: o RLS do banco garante que cada
// consulta enxerga apenas dados da própria empresa, e pesquisa de outra empresa dá 404.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: sessao } = await supabase.auth.getClaims();
  if (!sessao?.claims) return new Response("Entre na sua conta para baixar a planilha.", { status: 401 });

  const parametros = request.nextUrl.searchParams;
  const id = z.uuid().safeParse(parametros.get("pesquisa"));
  if (!id.success) return new Response("Pesquisa inválida.", { status: 400 });
  const aba = lerAba(parametros.get("aba") ?? undefined);

  const { data: pesquisa } = await supabase.from("pesquisas").select("id, slug").eq("id", id.data).maybeSingle();
  if (!pesquisa) return new Response("Pesquisa não encontrada.", { status: 404 });

  const [{ data: perguntas }, { data: suspeitosBruto }] = await Promise.all([
    supabase.from("perguntas").select("id, texto, tipo, ordem, arquivada").eq("pesquisa_id", pesquisa.id),
    supabase.rpc("envios_suspeitos", { p_pesquisa_id: pesquisa.id }),
  ]);

  const respostas: RespostaExportar[] = [];
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const { data, error } = await supabase
      .from("respostas")
      .select("id, created_at, descartada, respostas_itens(pergunta_id, valor_nota, valor_texto)")
      .eq("pesquisa_id", pesquisa.id)
      .order("created_at", { ascending: false })
      .order("id")
      .range(pagina * TAMANHO_PAGINA, (pagina + 1) * TAMANHO_PAGINA - 1);
    if (error) return new Response("Não deu para montar a planilha agora.", { status: 500 });
    respostas.push(...(data as unknown as RespostaExportar[]));
    if (!data || data.length < TAMANHO_PAGINA) break;
  }

  const linhas = montarLinhasRespostas(
    (perguntas ?? []) as PerguntaExportar[],
    respostas,
    new Set((suspeitosBruto ?? []).map((s) => s.resposta_id)),
    aba,
  );

  // Data de hoje no fuso de São Paulo, só para o nome do arquivo
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  return new Response(montarCsv(linhas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="respostas-${pesquisa.slug}-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
