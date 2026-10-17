"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const esquema = z.object({ empresaId: z.uuid(), notaBaixa: z.boolean(), relatorioSemanal: z.boolean() });

// Liga ou desliga os avisos por e-mail da empresa. O banco só deixa o dono mexer nestas duas colunas
// e só nas empresas dele (RLS): um id de outra empresa simplesmente não altera nada.
export async function salvarAvisos(
  empresaId: string,
  notaBaixa: boolean,
  relatorioSemanal: boolean,
): Promise<{ erro?: string }> {
  const pedido = esquema.safeParse({ empresaId, notaBaixa, relatorioSemanal });
  if (!pedido.success) return { erro: "Não deu para salvar agora. Tente de novo." };

  const supabase = await createClient();
  const { data: sessao } = await supabase.auth.getClaims();
  if (!sessao?.claims) return { erro: "Entre na sua conta de novo para salvar." };

  const { data, error } = await supabase
    .from("empresas")
    .update({ aviso_nota_baixa: pedido.data.notaBaixa, relatorio_semanal: pedido.data.relatorioSemanal })
    .eq("id", pedido.data.empresaId)
    .select("id");
  if (error || !data || data.length === 0) return { erro: "Não deu para salvar agora. Tente de novo." };

  revalidatePath("/painel");
  return {};
}
