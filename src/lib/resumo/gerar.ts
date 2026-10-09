import { ErroConfiguracaoIA } from "./erros";
import { limparResumo } from "./esquema";
import { montarPedido } from "./pedido";
import type { Resumo, TextoParaResumo } from "./tipos";

export type RespostaIA = { entrada: unknown; tokensEntrada?: number; tokensSaida?: number };
// A chamada real à IA é injetada: nos testes entra uma função falsa, sem rede
export type ChamarIA = (pedido: { system: string; usuario: string }) => Promise<RespostaIA>;

export type ResultadoGerar =
  | { ok: true; resumo: Resumo; tokensEntrada?: number; tokensSaida?: number }
  | { ok: false; motivo: "configuracao" | "ia" | "formato" };

export async function gerarResumo(textos: TextoParaResumo[], chamarIA: ChamarIA): Promise<ResultadoGerar> {
  try {
    const r = await chamarIA(montarPedido(textos));
    const resumo = limparResumo(r.entrada);
    if (!resumo) return { ok: false, motivo: "formato" };
    return { ok: true, resumo, tokensEntrada: r.tokensEntrada, tokensSaida: r.tokensSaida };
  } catch (e) {
    return { ok: false, motivo: e instanceof ErroConfiguracaoIA ? "configuracao" : "ia" };
  }
}
