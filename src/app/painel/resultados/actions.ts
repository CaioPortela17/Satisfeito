"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Painel } from "@/lib/painel/tipos";
import { chamarClaude } from "@/lib/resumo/cliente-ia";
import { gerarResumo } from "@/lib/resumo/gerar";
import { mensagemResumo } from "@/lib/resumo/mensagens";
import { montarNumeros } from "@/lib/resumo/numeros";
import { INTERVALO_MINUTOS, MINIMO_ENVIOS_RELATORIO, MODELO_RESUMO, TETO_DIARIO, podeGerar } from "@/lib/resumo/regras";
import type { ReservaResumo, TextosParaResumo, UsoResumos } from "@/lib/resumo/tipos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type EstadoResumo = { erro?: string; ok?: boolean };

const esquemaPedido = z.object({
  pesquisaId: z.uuid(),
  dias: z.union([z.literal(7), z.literal(30), z.literal(90)]),
  comNomes: z.boolean(),
});

// Passo a passo (cada passo pode parar com uma mensagem amigável):
// 1) sessão e pedido válidos; 2) lê os números e os textos com o cliente do usuário (o RLS garante que a
// pesquisa é dele); 3) mínimo de respostas no período; 4) confere intervalo e teto (aviso rápido);
// 5) RESERVA a vaga no banco (fila por dono: dois cliques ao mesmo tempo não passam do limite);
// 6) chama a IA com os números e os textos; 7) grava o relatório na vaga reservada (só o servidor grava);
// 8) atualiza a página.
// Se a IA falhar, a reserva é apagada para não gastar o intervalo nem o teto à toa.
export async function gerarResumoAction(
  pesquisaIdRecebido: string,
  diasRecebido: number,
  comNomesRecebido: boolean,
): Promise<EstadoResumo> {
  const pedido = esquemaPedido.safeParse({ pesquisaId: pesquisaIdRecebido, dias: diasRecebido, comNomes: comNomesRecebido });
  if (!pedido.success) return { erro: mensagemResumo("geral") };
  const { pesquisaId, dias, comNomes } = pedido.data;

  const supabase = await createClient();
  const { data: sessao } = await supabase.auth.getClaims();
  if (!sessao?.claims) return { erro: mensagemResumo("geral") };

  // Os números do período vêm do banco, nunca do navegador
  const { data: painelBruto } = await supabase.rpc("painel_pesquisa", { p_pesquisa_id: pesquisaId, p_dias: dias });
  const painel = painelBruto as unknown as Painel | null;
  if (!painel) return { erro: mensagemResumo("geral") };
  if (painel.atual.envios < MINIMO_ENVIOS_RELATORIO) return { erro: mensagemResumo("poucas") };

  const { data: pesquisa } = await supabase.from("pesquisas").select("titulo").eq("id", pesquisaId).maybeSingle();
  if (!pesquisa) return { erro: mensagemResumo("geral") };

  const { data: bruto } = await supabase.rpc("textos_para_resumo", { p_pesquisa_id: pesquisaId, p_dias: dias });
  const textos = bruto as unknown as TextosParaResumo | null; // Json do Supabase -> nosso tipo
  if (!textos) return { erro: mensagemResumo("geral") };

  const { data: usoBruto } = await supabase.rpc("uso_resumos_ia", { p_pesquisa_id: pesquisaId, p_dias: dias });
  const uso = usoBruto as unknown as UsoResumos | null;
  if (!uso) return { erro: mensagemResumo("geral") };

  const permissao = podeGerar(uso, new Date());
  if (!permissao.ok) {
    return { erro: mensagemResumo(permissao.motivo, permissao.motivo === "intervalo" ? permissao.minutos : undefined) };
  }

  const numeros = montarNumeros(painel, pesquisa.titulo, comNomes);

  // Reserva a vaga. A chave secreta só é usada depois de o banco conferir que a pesquisa é do usuário
  const admin = criarClienteAdmin();
  const { data: reservaBruta, error: erroReserva } = await admin.rpc("reservar_resumo_ia", {
    p_pesquisa_id: pesquisaId,
    p_dono: sessao.claims.sub,
    p_intervalo_min: INTERVALO_MINUTOS,
    p_teto: TETO_DIARIO,
    p_dias: dias,
    p_com_nomes: comNomes,
  });
  const reserva = reservaBruta as unknown as ReservaResumo | null;
  if (erroReserva || !reserva) return { erro: mensagemResumo("geral") };
  if (!reserva.ok) {
    return { erro: mensagemResumo(reserva.motivo, reserva.motivo === "intervalo" ? reserva.minutos : undefined) };
  }

  const liberarReserva = () => admin.from("resumos_ia").delete().eq("id", reserva.id).eq("estado", "gerando");

  try {
    const resultado = await gerarResumo(textos.textos, chamarClaude, numeros);
    if (!resultado.ok) {
      await liberarReserva();
      return { erro: mensagemResumo(resultado.motivo) };
    }

    // created_at = agora: o intervalo de 10 minutos conta do fim da geração
    const { error } = await admin
      .from("resumos_ia")
      .update({
        conteudo: resultado.resumo as unknown as Json,
        numeros: numeros as unknown as Json,
        respostas_lidas: textos.lidas,
        modelo: MODELO_RESUMO,
        tokens_entrada: resultado.tokensEntrada ?? null,
        tokens_saida: resultado.tokensSaida ?? null,
        estado: "pronto",
        created_at: new Date().toISOString(),
      })
      .eq("id", reserva.id)
      .eq("estado", "gerando");
    if (error) {
      await liberarReserva();
      return { erro: mensagemResumo("geral") };
    }
  } catch {
    await liberarReserva();
    return { erro: mensagemResumo("geral") };
  }

  revalidatePath("/painel/resultados");
  return { ok: true };
}
