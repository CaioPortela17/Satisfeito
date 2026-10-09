"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { chamarClaude } from "@/lib/resumo/cliente-ia";
import { gerarResumo } from "@/lib/resumo/gerar";
import { mensagemResumo } from "@/lib/resumo/mensagens";
import { MINIMO_TEXTOS, MODELO_RESUMO, podeGerar } from "@/lib/resumo/regras";
import type { TextosParaResumo, UsoResumos } from "@/lib/resumo/tipos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type EstadoResumo = { erro?: string; ok?: boolean };

const esquemaId = z.uuid();

// Passo a passo (cada passo pode parar com uma mensagem amigável):
// 1) sessão e id válidos; 2) lê os textos com o cliente do usuário (o RLS garante que a
// pesquisa é dele); 3) mínimo de textos; 4) intervalo e teto; 5) chama a IA; 6) grava com
// a chave secreta (só o servidor grava); 7) atualiza a página.
// Obs.: dois cliques simultâneos podem gerar dois resumos (corrida aceita, ver spec).
export async function gerarResumoAction(pesquisaIdRecebido: string): Promise<EstadoResumo> {
  const id = esquemaId.safeParse(pesquisaIdRecebido);
  if (!id.success) return { erro: mensagemResumo("geral") };

  const supabase = await createClient();
  const { data: sessao } = await supabase.auth.getClaims();
  if (!sessao?.claims) return { erro: mensagemResumo("geral") };

  const { data: bruto } = await supabase.rpc("textos_para_resumo", { p_pesquisa_id: id.data });
  const textos = bruto as unknown as TextosParaResumo | null; // Json do Supabase -> nosso tipo
  if (!textos) return { erro: mensagemResumo("geral") };
  if (textos.total < MINIMO_TEXTOS) return { erro: mensagemResumo("poucas") };

  const { data: usoBruto } = await supabase.rpc("uso_resumos_ia", { p_pesquisa_id: id.data });
  const uso = usoBruto as unknown as UsoResumos | null;
  if (!uso) return { erro: mensagemResumo("geral") };

  const permissao = podeGerar(uso, new Date());
  if (!permissao.ok) {
    return { erro: mensagemResumo(permissao.motivo, permissao.motivo === "intervalo" ? permissao.minutos : undefined) };
  }

  const resultado = await gerarResumo(textos.textos, chamarClaude);
  if (!resultado.ok) return { erro: mensagemResumo(resultado.motivo) };

  const admin = criarClienteAdmin();
  const { error } = await admin.from("resumos_ia").insert({
    pesquisa_id: id.data,
    conteudo: resultado.resumo as unknown as Json,
    respostas_lidas: textos.textos.length,
    modelo: MODELO_RESUMO,
    tokens_entrada: resultado.tokensEntrada ?? null,
    tokens_saida: resultado.tokensSaida ?? null,
  });
  if (error) return { erro: mensagemResumo("geral") };

  revalidatePath("/painel/resultados");
  return { ok: true };
}
