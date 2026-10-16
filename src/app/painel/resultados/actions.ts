"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { chamarClaude } from "@/lib/resumo/cliente-ia";
import { gerarResumo } from "@/lib/resumo/gerar";
import { mensagemResumo } from "@/lib/resumo/mensagens";
import { INTERVALO_MINUTOS, MINIMO_TEXTOS, MODELO_RESUMO, TETO_DIARIO, podeGerar } from "@/lib/resumo/regras";
import type { ReservaResumo, TextosParaResumo, UsoResumos } from "@/lib/resumo/tipos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type EstadoResumo = { erro?: string; ok?: boolean };

const esquemaId = z.uuid();

// Passo a passo (cada passo pode parar com uma mensagem amigável):
// 1) sessão e id válidos; 2) lê os textos com o cliente do usuário (o RLS garante que a
// pesquisa é dele); 3) mínimo de textos; 4) confere intervalo e teto (aviso rápido);
// 5) RESERVA a vaga no banco (fila por dono: dois cliques ao mesmo tempo não passam do limite);
// 6) chama a IA; 7) grava o resumo na vaga reservada (só o servidor grava); 8) atualiza a página.
// Se a IA falhar, a reserva é apagada para não gastar o intervalo nem o teto à toa.
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

  // Reserva a vaga. A chave secreta só é usada depois de o banco conferir que a pesquisa é do usuário
  const admin = criarClienteAdmin();
  const { data: reservaBruta, error: erroReserva } = await admin.rpc("reservar_resumo_ia", {
    p_pesquisa_id: id.data,
    p_dono: sessao.claims.sub,
    p_intervalo_min: INTERVALO_MINUTOS,
    p_teto: TETO_DIARIO,
  });
  const reserva = reservaBruta as unknown as ReservaResumo | null;
  if (erroReserva || !reserva) return { erro: mensagemResumo("geral") };
  if (!reserva.ok) {
    return { erro: mensagemResumo(reserva.motivo, reserva.motivo === "intervalo" ? reserva.minutos : undefined) };
  }

  const liberarReserva = () => admin.from("resumos_ia").delete().eq("id", reserva.id).eq("estado", "gerando");

  try {
    const resultado = await gerarResumo(textos.textos, chamarClaude);
    if (!resultado.ok) {
      await liberarReserva();
      return { erro: mensagemResumo(resultado.motivo) };
    }

    // created_at = agora: o intervalo de 10 minutos conta do fim da geração
    const { error } = await admin
      .from("resumos_ia")
      .update({
        conteudo: resultado.resumo as unknown as Json,
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
