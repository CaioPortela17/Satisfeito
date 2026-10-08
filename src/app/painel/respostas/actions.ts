"use server";

import { revalidatePath } from "next/cache";
import {
  esquemaIdResposta,
  esquemaIdsResposta,
  mensagemErroDescarte,
} from "@/lib/respostas/lista";
import { createClient } from "@/lib/supabase/server";

export type EstadoDescarte = { erro?: string; ok?: number };

// Muda a coluna "descartada" dos envios pedidos. Quem decide se o envio é do usuário é o RLS:
// envio de outra empresa não é encontrado e o update devolve menos linhas do que pedimos.
async function alterar(ids: string[], descartada: boolean): Promise<EstadoDescarte> {
  const supabase = await createClient();
  const { data: sessao } = await supabase.auth.getClaims();
  if (!sessao?.claims) return { erro: mensagemErroDescarte() };

  const unicos = [...new Set(ids)];
  const { data, error } = await supabase
    .from("respostas")
    .update({ descartada })
    .in("id", unicos)
    .select("id");
  if (error || !data || data.length !== unicos.length) return { erro: mensagemErroDescarte() };

  // Os números de Resultados mudam junto (as descartadas não entram em nada)
  revalidatePath("/painel/respostas");
  revalidatePath("/painel/resultados");
  return { ok: Date.now() };
}

export async function descartarResposta(idRecebido: string): Promise<EstadoDescarte> {
  const id = esquemaIdResposta.safeParse(idRecebido);
  if (!id.success) return { erro: mensagemErroDescarte() };
  return alterar([id.data], true);
}

export async function restaurarResposta(idRecebido: string): Promise<EstadoDescarte> {
  const id = esquemaIdResposta.safeParse(idRecebido);
  if (!id.success) return { erro: mensagemErroDescarte() };
  return alterar([id.data], false);
}

export async function descartarVarias(idsRecebidos: string[]): Promise<EstadoDescarte> {
  const ids = esquemaIdsResposta.safeParse(idsRecebidos);
  if (!ids.success) return { erro: mensagemErroDescarte() };
  return alterar(ids.data, true);
}
