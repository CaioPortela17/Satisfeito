// Regras dos avisos. A média "ruim" é a mesma da regra de respostas suspeitas (4 ou menos).
export const MEDIA_RUIM = 4;

// Janelas e limites (a conferência de verdade é feita no banco, em reservar_aviso)
export const JANELA_NOTA_BAIXA_MIN = 30; // no máximo 1 aviso de nota baixa a cada 30 min por pesquisa
export const JANELA_RAJADA_MIN = 360; // no máximo 1 aviso de rajada a cada 6 horas por pesquisa
export const JANELA_RELATORIO_SEMANAL_MIN = 9360; // 6,5 dias: roda todo dia e só manda o que está há uma semana sem receber
export const TETO_AVISOS_DIA = 10; // por empresa, nas últimas 24 horas

// Média das notas de um envio (null se não tem nota)
export function mediaDasNotas(itens: { valor_nota?: number | null }[]): number | null {
  const notas = itens.map((i) => i.valor_nota).filter((n): n is number => typeof n === "number");
  if (notas.length === 0) return null;
  return notas.reduce((a, b) => a + b, 0) / notas.length;
}

export function ehRespostaRuim(media: number | null): boolean {
  return media !== null && media <= MEDIA_RUIM;
}
