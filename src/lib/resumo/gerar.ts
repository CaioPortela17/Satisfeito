import { ErroConfiguracaoIA } from "./erros";
import { limparResumo } from "./esquema";
import { montarPedido } from "./pedido";
import { numerosDesconhecidos } from "./validar-numeros";
import type { NumerosRelatorio, ResumoRelatorio, TextoParaResumo } from "./tipos";

export type RespostaIA = { entrada: unknown; tokensEntrada?: number; tokensSaida?: number };
// A chamada real à IA é injetada: nos testes entra uma função falsa, sem rede
export type ChamarIA = (pedido: { system: string; usuario: string }) => Promise<RespostaIA>;

export type ResultadoGerar =
  | { ok: true; resumo: ResumoRelatorio; tokensEntrada?: number; tokensSaida?: number }
  | { ok: false; motivo: "configuracao" | "ia" | "formato" };

// Se a IA citar um número que não está nos dados, damos mais uma chance antes de desistir
const TENTATIVAS = 2;

export async function gerarResumo(
  textos: TextoParaResumo[],
  chamarIA: ChamarIA,
  numeros: NumerosRelatorio,
): Promise<ResultadoGerar> {
  try {
    const pedido = montarPedido(textos, numeros);
    let tokensEntrada = 0;
    let tokensSaida = 0;
    for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
      const r = await chamarIA(pedido);
      tokensEntrada += r.tokensEntrada ?? 0;
      tokensSaida += r.tokensSaida ?? 0;
      const resumo = limparResumo(r.entrada);
      if (resumo && numerosDesconhecidos(resumo, numeros).length === 0) {
        return {
          ok: true,
          resumo,
          tokensEntrada: tokensEntrada || undefined,
          tokensSaida: tokensSaida || undefined,
        };
      }
    }
    return { ok: false, motivo: "formato" };
  } catch (e) {
    if (!(e instanceof ErroConfiguracaoIA)) {
      // Registra só o NOME da classe do erro (e o status HTTP, se houver). Nunca a mensagem,
      // o pedido ou os textos dos clientes, para não vazar dados nos logs.
      const status = (e as { status?: unknown } | null)?.status;
      const nome = e instanceof Error ? e.constructor.name : "ErroDesconhecido";
      console.error(`resumo IA falhou: ${nome}${typeof status === "number" ? ` ${status}` : ""}`);
    }
    return { ok: false, motivo: e instanceof ErroConfiguracaoIA ? "configuracao" : "ia" };
  }
}
