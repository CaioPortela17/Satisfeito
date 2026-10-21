"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { gerarRelatorio } from "@/lib/resumo/pipeline";
import { mensagemResumo } from "@/lib/resumo/mensagens";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type EstadoResumo = { erro?: string; ok?: boolean };

const esquemaPedido = z.object({
  pesquisaId: z.uuid(),
  dias: z.union([z.literal(7), z.literal(30), z.literal(90)]),
});

// Gera o relatório da pesquisa. Os números e textos são lidos com o cliente do usuário (o RLS garante que a
// pesquisa é dele); o passo a passo (mínimo de respostas, intervalo, teto, reserva da vaga, IA e gravação)
// está em gerarRelatorio (src/lib/resumo/pipeline.ts), o mesmo usado pelo relatório semanal automático.
export async function gerarResumoAction(
  pesquisaIdRecebido: string,
  diasRecebido: number,
): Promise<EstadoResumo> {
  const pedido = esquemaPedido.safeParse({ pesquisaId: pesquisaIdRecebido, dias: diasRecebido });
  if (!pedido.success) return { erro: mensagemResumo("geral") };

  const supabase = await createClient();
  const { data: sessao } = await supabase.auth.getClaims();
  if (!sessao?.claims) return { erro: mensagemResumo("geral") };

  const resultado = await gerarRelatorio({
    leitura: supabase,
    admin: criarClienteAdmin(),
    donoId: sessao.claims.sub,
    pesquisaId: pedido.data.pesquisaId,
    dias: pedido.data.dias,
  });
  if (!resultado.ok) return { erro: resultado.erro };

  revalidatePath("/painel/resultados");
  return { ok: true };
}
