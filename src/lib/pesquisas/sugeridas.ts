import type { TipoPergunta } from "./esquemas";

export type PerguntaSugerida = { texto: string; tipo: TipoPergunta; obrigatoria: boolean };

export const TITULO_SUGERIDO = "Pesquisa de satisfação";

// Pesquisa nova já vem pronta: o dono só ajusta.
// "Quem te atendeu?" só entra se houver alguém para escolher.
export function perguntasSugeridas(temFuncionarios: boolean): PerguntaSugerida[] {
  return [
    { texto: "Que nota você dá para o nosso atendimento?", tipo: "nota", obrigatoria: true },
    ...(temFuncionarios
      ? [{ texto: "Quem te atendeu?", tipo: "funcionario" as const, obrigatoria: false }]
      : []),
    { texto: "Quer contar mais alguma coisa?", tipo: "texto", obrigatoria: false },
  ];
}
