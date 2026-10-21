import type { TipoPergunta } from "./esquemas";

export type PerguntaSugerida = { texto: string; tipo: TipoPergunta; obrigatoria: boolean };

export const TITULO_SUGERIDO = "Pesquisa de satisfação";

// Pesquisa nova já vem pronta: o dono só ajusta.
export function perguntasSugeridas(): PerguntaSugerida[] {
  return [
    { texto: "Que nota você dá para o nosso atendimento?", tipo: "nota", obrigatoria: false },
    { texto: "Quer nos contar mais alguma coisa?", tipo: "texto", obrigatoria: false },
  ];
}
