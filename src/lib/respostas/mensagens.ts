const PROBLEMA = "Alguma resposta veio com problema. Recarregue a página e tente de novo.";

// Códigos próprios da função registrar_resposta (migração da Etapa 5A)
const MENSAGENS: Record<string, string> = {
  SF101: "Essa pesquisa não está recebendo respostas agora.",
  SF102: PROBLEMA,
  SF103: PROBLEMA,
  SF104: "Responda as perguntas obrigatórias.",
  SF105: "Responda pelo menos uma pergunta.",
};

export function mensagemErroResposta(codigo?: string): string {
  return (codigo && MENSAGENS[codigo]) || "Não deu para enviar agora. Tente de novo em instantes.";
}
