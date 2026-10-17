import { criarClienteAdmin } from "@/lib/supabase/admin";
import { emailAtivo, enviarEmail } from "./email";
import { montarAvisoNotaBaixa, montarAvisoRajada, montarEmailRelatorioSemanal } from "./mensagens";
import {
  JANELA_NOTA_BAIXA_MIN,
  JANELA_RAJADA_MIN,
  JANELA_RELATORIO_SEMANAL_MIN,
  TETO_AVISOS_DIA,
  ehRespostaRuim,
} from "./regras";

export type ResultadoAviso = "enviado" | "ignorado" | "desativado" | "falhou";
type Tipo = "nota_baixa" | "rajada" | "relatorio_semanal";

type Reserva = { ok: true; id: string; dono: string; empresa: string; pesquisa: string } | { ok: false; motivo: string };

function enderecoDoSite(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// Reserva o aviso no banco (janela, limite por dia, opção do dono), acha o e-mail do dono e envia.
// Se o e-mail não sair, a reserva é desfeita para uma próxima chance. Nunca lança erro: um aviso que falha
// jamais pode atrapalhar quem está respondendo a pesquisa.
async function reservarEEnviar(
  pesquisaId: string,
  tipo: Tipo,
  janelaMin: number,
  montar: (r: Extract<Reserva, { ok: true }>, site: string) => { assunto: string; texto: string },
): Promise<ResultadoAviso> {
  if (!emailAtivo()) return "desativado";
  const admin = criarClienteAdmin();
  const { data, error } = await admin.rpc("reservar_aviso", {
    p_pesquisa_id: pesquisaId,
    p_tipo: tipo,
    p_janela_min: janelaMin,
    p_teto_dia: TETO_AVISOS_DIA,
  });
  const reserva = data as unknown as Reserva | null;
  if (error || !reserva || !reserva.ok) return "ignorado";

  const desfazer = () => admin.from("avisos_enviados").delete().eq("id", reserva.id);
  const { data: usuario } = await admin.auth.admin.getUserById(reserva.dono);
  const para = usuario?.user?.email;
  if (!para) {
    await desfazer();
    return "falhou";
  }
  const resultado = await enviarEmail({ para, ...montar(reserva, enderecoDoSite()) });
  if (resultado !== "enviado") {
    await desfazer();
    return resultado === "desativado" ? "desativado" : "falhou";
  }
  return "enviado";
}

// Chamada depois que uma resposta é gravada (fora do caminho do cliente, via after()). Só age em resposta ruim.
// Se a resposta faz parte de uma rajada suspeita, manda o aviso de rajada; senão, o de nota baixa.
export async function avisarSobreResposta(args: { pesquisaId: string; respostaId: string; media: number | null }): Promise<ResultadoAviso> {
  try {
    if (!ehRespostaRuim(args.media)) return "ignorado";
    const media = args.media as number;
    const admin = criarClienteAdmin();
    const { data: suspeitos } = await admin.rpc("envios_suspeitos", { p_pesquisa_id: args.pesquisaId });
    const emRajada = (suspeitos ?? []).some((s) => s.resposta_id === args.respostaId);

    const ctx = (r: { empresa: string; pesquisa: string }, site: string) => ({
      empresa: r.empresa,
      pesquisa: r.pesquisa,
      site,
      pesquisaId: args.pesquisaId,
    });
    if (emRajada) {
      const r = await reservarEEnviar(args.pesquisaId, "rajada", JANELA_RAJADA_MIN, (res, site) => montarAvisoRajada(ctx(res, site)));
      if (r === "enviado") return r;
      // rajada já avisada recentemente: não manda também o de nota baixa (seria o mesmo problema)
      if (r === "ignorado") return "ignorado";
    }
    return await reservarEEnviar(args.pesquisaId, "nota_baixa", JANELA_NOTA_BAIXA_MIN, (res, site) =>
      montarAvisoNotaBaixa({ ...ctx(res, site), media }),
    );
  } catch (e) {
    console.error(`aviso de nota baixa falhou: ${e instanceof Error ? e.constructor.name : "ErroDesconhecido"}`);
    return "falhou";
  }
}

// Usado pelo relatório semanal (cron): manda o texto pronto para o e-mail do dono
export function enviarRelatorioSemanal(pesquisaId: string, relatorio: string): Promise<ResultadoAviso> {
  return reservarEEnviar(pesquisaId, "relatorio_semanal", JANELA_RELATORIO_SEMANAL_MIN, (res, site) =>
    montarEmailRelatorioSemanal({ empresa: res.empresa, pesquisa: res.pesquisa, site, pesquisaId, relatorio }),
  );
}
