import type { Periodo } from "./tipos";

export const DIAS_VALIDOS = [7, 30, 90] as const;
export const PERIODO_PADRAO: Periodo = 30;

// ?dias=7|30|90 da URL. Qualquer outra coisa (vazio, texto, 7.5, -7) cai no padrão,
// para a página nunca quebrar por causa de um endereço digitado errado.
export function lerDias(valor: string | undefined): Periodo {
  const n = Number(valor);
  return (DIAS_VALIDOS as readonly number[]).includes(n) && String(n) === valor ? (n as Periodo) : PERIODO_PADRAO;
}
