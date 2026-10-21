import type { SupabaseClient } from "@supabase/supabase-js";
import type { Painel, Periodo } from "@/lib/painel/tipos";
import type { Database, Json } from "@/lib/supabase/database.types";
import { chamarClaude } from "./cliente-ia";
import { gerarResumo } from "./gerar";
import { mensagemResumo } from "./mensagens";
import { montarNumeros } from "./numeros";
import { INTERVALO_MINUTOS, MINIMO_ENVIOS_RELATORIO, MODELO_RESUMO, TETO_DIARIO, podeGerar } from "./regras";
import type { NumerosRelatorio, ReservaResumo, ResumoRelatorio, TextosParaResumo, UsoResumos } from "./tipos";

type Cliente = SupabaseClient<Database>;

export type EntradaRelatorio = {
  // Cliente para LER os números e textos: o do usuário logado (RLS) na tela, ou o da chave secreta no cron.
  leitura: Cliente;
  // Cliente da chave secreta: só reserva a vaga e grava o resultado.
  admin: Cliente;
  donoId: string;
  pesquisaId: string;
  dias: Periodo;
};

export type ResultadoRelatorio =
  | { ok: true; resumo: ResumoRelatorio; numeros: NumerosRelatorio }
  | { ok: false; erro: string };

// Passo a passo (cada passo pode parar com uma mensagem amigável):
// 1) lê os números do período e o título; 2) mínimo de respostas; 3) lê os textos; 4) confere intervalo e teto
// (aviso rápido); 5) RESERVA a vaga no banco (fila por dono: dois pedidos ao mesmo tempo não passam do limite);
// 6) chama a IA com os números e os textos; 7) grava o relatório na vaga reservada.
// Se a IA falhar, a reserva é apagada para não gastar o intervalo nem o teto à toa.
export async function gerarRelatorio(e: EntradaRelatorio): Promise<ResultadoRelatorio> {
  const { leitura, admin, pesquisaId, dias } = e;
  const falha = (erro: string): ResultadoRelatorio => ({ ok: false, erro });

  const { data: painelBruto } = await leitura.rpc("painel_pesquisa", { p_pesquisa_id: pesquisaId, p_dias: dias });
  const painel = painelBruto as unknown as Painel | null;
  if (!painel) return falha(mensagemResumo("geral"));
  if (painel.atual.envios < MINIMO_ENVIOS_RELATORIO) return falha(mensagemResumo("poucas"));

  const { data: pesquisa } = await leitura.from("pesquisas").select("titulo").eq("id", pesquisaId).maybeSingle();
  if (!pesquisa) return falha(mensagemResumo("geral"));

  const { data: bruto } = await leitura.rpc("textos_para_resumo", { p_pesquisa_id: pesquisaId, p_dias: dias });
  const textos = bruto as unknown as TextosParaResumo | null;
  if (!textos) return falha(mensagemResumo("geral"));

  const { data: usoBruto } = await leitura.rpc("uso_resumos_ia", { p_pesquisa_id: pesquisaId, p_dias: dias });
  const uso = usoBruto as unknown as UsoResumos | null;
  if (!uso) return falha(mensagemResumo("geral"));
  const permissao = podeGerar(uso, new Date());
  if (!permissao.ok) {
    return falha(mensagemResumo(permissao.motivo, permissao.motivo === "intervalo" ? permissao.minutos : undefined));
  }

  const numeros = montarNumeros(painel, pesquisa.titulo);

  // A chave secreta só reserva depois de o banco conferir que a pesquisa é do dono
  const { data: reservaBruta, error: erroReserva } = await admin.rpc("reservar_resumo_ia", {
    p_pesquisa_id: pesquisaId,
    p_dono: e.donoId,
    p_intervalo_min: INTERVALO_MINUTOS,
    p_teto: TETO_DIARIO,
    p_dias: dias,
    p_com_nomes: false, // citar nomes da equipe saiu do produto; a coluna continua no banco
  });
  const reserva = reservaBruta as unknown as ReservaResumo | null;
  if (erroReserva || !reserva) return falha(mensagemResumo("geral"));
  if (!reserva.ok) {
    return falha(mensagemResumo(reserva.motivo, reserva.motivo === "intervalo" ? reserva.minutos : undefined));
  }

  const liberarReserva = () => admin.from("resumos_ia").delete().eq("id", reserva.id).eq("estado", "gerando");

  try {
    const resultado = await gerarResumo(textos.textos, chamarClaude, numeros);
    if (!resultado.ok) {
      await liberarReserva();
      return falha(mensagemResumo(resultado.motivo));
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
      return falha(mensagemResumo("geral"));
    }
    return { ok: true, resumo: resultado.resumo, numeros };
  } catch {
    await liberarReserva();
    return falha(mensagemResumo("geral"));
  }
}
