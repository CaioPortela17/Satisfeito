import type { NomeTurno } from "./tipos";

// Regras de "dados suficientes" (iguais às do banco e do desenho da Etapa 6C)
export const MIN_COMPARACAO = 5; // envios em cada período para comparar
export const MIN_CELULA = 3; // envios num dia da semana ou turno para ele valer como destaque
export const MIN_NPS = 10; // envios com nota para mostrar o NPS (o banco devolve null abaixo disso)

export type Variacao = { tipo: "poucos-dados" } | { tipo: "igual" } | { tipo: "sobe" | "desce"; diferenca: number };

const POUCOS: Variacao = { tipo: "poucos-dados" };

function comparar(atual: number, anterior: number, casas: number): Variacao {
  const fator = 10 ** casas;
  const diferenca = Math.round(Math.abs(atual - anterior) * fator) / fator;
  if (Math.abs(atual - anterior) < 0.5 / fator || diferenca === 0) return { tipo: "igual" };
  return { tipo: atual > anterior ? "sobe" : "desce", diferenca };
}

// Média: só compara com 5 envios ou mais nos dois períodos (uma média de 2 envios engana)
export function variacaoMedia(
  atual: number | null,
  anterior: number | null,
  enviosAtual: number,
  enviosAnterior: number,
): Variacao {
  if (atual === null || anterior === null) return POUCOS;
  if (enviosAtual < MIN_COMPARACAO || enviosAnterior < MIN_COMPARACAO) return POUCOS;
  return comparar(atual, anterior, 1);
}

// Total de envios: mesma regra de 5 ou mais nos dois períodos
export function variacaoContagem(atual: number, anterior: number): Variacao {
  if (atual < MIN_COMPARACAO || anterior < MIN_COMPARACAO) return POUCOS;
  return comparar(atual, anterior, 0);
}

// NPS: o banco já devolve null com menos de 10 envios, então basta ter os dois
export function variacaoNps(atual: number | null, anterior: number | null): Variacao {
  if (atual === null || anterior === null) return POUCOS;
  return comparar(atual, anterior, 0);
}

export type TipoNumero = "media" | "contagem" | "nps";

function numeroPtBr(n: number): string {
  return String(n).replace(".", ",");
}

// A frase que acompanha a seta (a seta e a cor sozinhas não bastam)
export function textoVariacao(v: Variacao, tipo: TipoNumero): string {
  if (v.tipo === "poucos-dados") return "Poucos dados para comparar";
  if (v.tipo === "igual") return "Igual ao período anterior";
  const sentido = v.tipo === "sobe" ? "a mais" : "a menos";
  const numero = numeroPtBr(v.diferenca);
  const unidade = tipo === "nps" ? (v.diferenca === 1 ? " ponto" : " pontos") : "";
  return `${numero}${unidade} ${sentido} que no período anterior`;
}

// Zonas conhecidas do NPS
export function rotuloNps(valor: number): string {
  if (valor >= 75) return "Excelente";
  if (valor >= 50) return "Muito bom";
  if (valor >= 0) return "Razoável";
  return "Crítico";
}

const DIAS = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"];
// 1 = segunda ... 7 = domingo (igual ao isodow do Postgres)
export function nomeDia(dia: number): string {
  return DIAS[dia - 1] ?? "";
}

const TURNOS: Record<NomeTurno, string> = {
  manha: "Manhã (6h às 12h)",
  tarde: "Tarde (12h às 18h)",
  noite: "Noite (18h à meia-noite)",
  madrugada: "Madrugada (meia-noite às 6h)",
};
export function rotuloTurno(turno: NomeTurno): string {
  return TURNOS[turno];
}

export function percentual(parte: number, total: number): number {
  return total === 0 ? 0 : Math.round((100 * parte) / total);
}

// Entre dias ou turnos: quem é o melhor e quem é o mais fraco. Só entram os que têm 3 envios ou mais,
// e só há destaque com pelo menos dois deles e médias diferentes. Empate fica com o primeiro da lista.
export function extremos(itens: { media: number | null; envios: number }[]): { melhor: number | null; pior: number | null } {
  const validos = itens
    .map((x, i) => ({ media: x.media, envios: x.envios, i }))
    .filter((x): x is { media: number; envios: number; i: number } => x.media !== null && x.envios >= MIN_CELULA);
  if (validos.length < 2) return { melhor: null, pior: null };
  let melhor = validos[0];
  let pior = validos[0];
  for (const x of validos) {
    if (x.media > melhor.media) melhor = x;
    if (x.media < pior.media) pior = x;
  }
  if (melhor.media === pior.media) return { melhor: null, pior: null };
  return { melhor: melhor.i, pior: pior.i };
}
