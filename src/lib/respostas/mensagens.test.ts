import { describe, expect, it } from "vitest";
import { mensagemErroResposta } from "./mensagens";

describe("mensagemErroResposta", () => {
  it("traduz os códigos da função registrar_resposta", () => {
    expect(mensagemErroResposta("SF101")).toBe("Essa pesquisa não está recebendo respostas agora.");
    expect(mensagemErroResposta("SF102")).toBe("Alguma resposta veio com problema. Recarregue a página e tente de novo.");
    expect(mensagemErroResposta("SF103")).toBe("Alguma resposta veio com problema. Recarregue a página e tente de novo.");
    expect(mensagemErroResposta("SF104")).toBe("Responda as perguntas obrigatórias.");
    expect(mensagemErroResposta("SF105")).toBe("Responda pelo menos uma pergunta.");
  });
  it("genérica nos outros casos", () => {
    expect(mensagemErroResposta()).toBe("Não deu para enviar agora. Tente de novo em instantes.");
    expect(mensagemErroResposta("XX000")).toBe("Não deu para enviar agora. Tente de novo em instantes.");
  });
});
