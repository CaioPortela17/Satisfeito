import { z } from "zod";

export const TIPOS_PERGUNTA = ["nota", "texto", "funcionario"] as const;
export type TipoPergunta = (typeof TIPOS_PERGUNTA)[number];

// Pesquisa curta = cliente responde em menos de 30 segundos
export const LIMITE_PERGUNTAS = 10;

// Mesmas regras do banco (check constraints)
export const esquemaTituloPesquisa = z
  .string("Dê um nome para a pesquisa.")
  .trim()
  .min(1, "Dê um nome para a pesquisa.")
  .max(80, "O nome pode ter no máximo 80 caracteres.");

export const esquemaTextoPergunta = z
  .string("Escreva a pergunta.")
  .trim()
  .min(1, "Escreva a pergunta.")
  .max(120, "A pergunta pode ter no máximo 120 caracteres.");

export const esquemaTipoPergunta = z.enum(TIPOS_PERGUNTA, "Escolha o tipo da pergunta.");

// Ids chegam do navegador: conferimos o formato antes de usar
export const esquemaIdPesquisa = z.uuid("Item inválido.");

const MENSAGENS: Record<string, string> = {
  // unique_violation: índice "uma pergunta de funcionário por pesquisa"
  "23505": 'Essa pesquisa já tem a pergunta "Quem te atendeu?".',
  // erro próprio do trigger limitar_perguntas
  SF001: "Pesquisas curtas recebem mais respostas. O limite é 10 perguntas.",
};

export function mensagemErroPesquisa(codigo?: string): string {
  return (codigo && MENSAGENS[codigo]) || "Algo deu errado. Tente de novo em instantes.";
}
