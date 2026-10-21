const PROBLEMA = "Alguma resposta veio com problema. Recarregue a página e tente de novo.";

// Códigos próprios da função registrar_resposta (migração da Etapa 5A)
const MENSAGENS: Record<string, string> = {
  SF101: "Essa pesquisa não está recebendo respostas agora.",
  SF102: PROBLEMA,
  SF103: PROBLEMA,
  SF105: "Responda pelo menos uma pergunta.",
};

export function mensagemErroResposta(codigo?: string): string {
  return (codigo && MENSAGENS[codigo]) || "Não deu para enviar agora. Tente de novo em instantes.";
}

export function mensagemTurnstile(resultado: "invalido" | "indisponivel"): string {
  return resultado === "invalido"
    ? "Não conseguimos confirmar que você é uma pessoa. Recarregue a página e tente de novo."
    : "Não deu para verificar agora. Tente de novo em instantes.";
}
