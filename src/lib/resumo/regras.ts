import type { UsoResumos } from "./tipos";

// Qual modelo da Anthropic gera o resumo (troque aqui se quiser outro)
export const MODELO_RESUMO = "claude-haiku-5-5";

export const INTERVALO_MINUTOS = 10; // espera entre dois resumos da mesma pesquisa
export const TETO_DIARIO = 20; // resumos por dia, somando todas as pesquisas de todas as empresas do mesmo dono
export const MINIMO_TEXTOS = 3; // com menos respostas escritas que isso, não vale chamar a IA
// MAX_TEXTOS e MAX_CARACTERES_TEXTO espelham os limites fixos na função SQL textos_para_resumo
// (limit 200, left(..., 1000)): mude os dois lados juntos.
// INTERVALO_MINUTOS e TETO_DIARIO valem no banco via reservar_resumo_ia (a action passa os dois como parâmetro).
export const MAX_TEXTOS = 200; // quantos textos no máximo vão para a IA
export const MAX_CARACTERES_TEXTO = 1000; // cada texto é cortado aqui

export type PodeGerar =
  | { ok: true }
  | { ok: false; motivo: "teto" }
  | { ok: false; motivo: "intervalo"; minutos: number };

// Decide se dá para gerar agora. O teto do dia vem antes do intervalo.
export function podeGerar(uso: Pick<UsoResumos, "ultimo" | "hoje">, agora: Date): PodeGerar {
  if (uso.hoje >= TETO_DIARIO) return { ok: false, motivo: "teto" };
  if (uso.ultimo) {
    // O relógio do banco pode estar alguns segundos à frente do servidor: não deixamos o tempo passado ficar negativo
    // Se a data vier inválida (NaN), tratamos como "acabou de gerar": melhor bloquear do que deixar passar
    const criadoMs = Date.parse(uso.ultimo.created_at);
    const passadoMs = Number.isNaN(criadoMs) ? 0 : Math.max(0, agora.getTime() - criadoMs);
    const faltaMs = INTERVALO_MINUTOS * 60_000 - passadoMs;
    if (faltaMs > 0) return { ok: false, motivo: "intervalo", minutos: Math.ceil(faltaMs / 60_000) };
  }
  return { ok: true };
}
