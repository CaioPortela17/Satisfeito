import { describe, expect, it } from "vitest";
import { perguntasSugeridas, TITULO_SUGERIDO } from "./sugeridas";

describe("perguntasSugeridas", () => {
  it("nota e pergunta livre final, nessa ordem, sem nada obrigatório", () => {
    expect(perguntasSugeridas()).toEqual([
      { texto: "Que nota você dá para o nosso atendimento?", tipo: "nota", obrigatoria: false },
      { texto: "Quer nos contar mais alguma coisa?", tipo: "texto", obrigatoria: false },
    ]);
  });
  it("título sugerido", () => {
    expect(TITULO_SUGERIDO).toBe("Pesquisa de satisfação");
  });
});
