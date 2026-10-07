import { createHmac, timingSafeEqual } from "node:crypto";

// Proteção contra robôs: a página entrega a hora em que abriu, assinada pelo servidor.
// Ninguém consegue inventar um carimbo sem o segredo (CARIMBO_SEGREDO).
export const TEMPO_MINIMO_MS = 3_000;
export const VALIDADE_MS = 2 * 60 * 60 * 1000;

export type ResultadoCarimbo = "ok" | "invalido" | "rapido" | "expirado";

function assinar(ms: string, segredo: string) {
  return createHmac("sha256", segredo).update(ms).digest("base64url");
}

export function criarCarimbo(agoraMs: number, segredo: string): string {
  const ms = String(agoraMs);
  return `${ms}.${assinar(ms, segredo)}`;
}

export function verificarCarimbo(carimbo: string, agoraMs: number, segredo: string): ResultadoCarimbo {
  const partes = carimbo.split(".");
  const [ms, assinatura] = partes;
  if (partes.length !== 2 || !/^\d+$/.test(ms) || !assinatura) return "invalido";

  // Comparação em tempo constante: não dá pista de "quanto acertou"
  const esperada = Buffer.from(assinar(ms, segredo));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return "invalido";

  const decorrido = agoraMs - Number(ms);
  if (decorrido < TEMPO_MINIMO_MS) return "rapido";
  if (decorrido > VALIDADE_MS) return "expirado";
  return "ok";
}
