// Faixas usadas no painel para colorir as notas (escala de 1 a 10).
// boa = menta, atencao = manga, ruim = coral.
export type Faixa = "boa" | "atencao" | "ruim";

export function faixaDaNota(nota: number): Faixa {
  if (nota >= 8) return "boa";
  if (nota >= 6) return "atencao";
  return "ruim";
}
