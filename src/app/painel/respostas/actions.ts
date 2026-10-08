"use server";

import { revalidatePath } from "next/cache";
import {
  esquemaIdResposta,
  esquemaIdsResposta,
  mensagemErroDescarte,
} from "@/lib/respostas/lista";
import { createClient } from "@/lib/supabase/server";

export type EstadoDescarte = { erro?: string };

// Muda a coluna "descartada" das respostas pedidas. Quem decide se a resposta é do usuário é o RLS:
// resposta de outra empresa não é encontrado e o update devolve menos linhas do que pedimos.
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
  // Mesmo se só parte das linhas foi atualizada, as telas precisam recarregar (as que mudaram já mudaram)
  if (!error && data && data.length > 0) {
    // Os números de Resultados mudam junto (as descartadas não entram em nada)
    revalidatePath("/painel/respostas");
    revalidatePath("/painel/resultados");
  }
  if (error || !data || data.length !== unicos.length) return { erro: mensagemErroDescarte() };

  return {};
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
