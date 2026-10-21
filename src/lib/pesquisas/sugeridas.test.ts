import { describe, expect, it } from "vitest";
import { perguntasSugeridas, TITULO_SUGERIDO } from "./sugeridas";

describe("perguntasSugeridas", () => {
  it("com funcionários: nota, quem atendeu e comentário, nessa ordem", () => {
    expect(perguntasSugeridas(true)).toEqual([
      { texto: "Que nota você dá para o nosso atendimento?", tipo: "nota", obrigatoria: false },
      { texto: "Quem te atendeu?", tipo: "funcionario", obrigatoria: false },
      { texto: "Onde podemos melhorar?", tipo: "texto", obrigatoria: false },
    ]);
  });
  it("sem funcionários: pula o “Quem te atendeu?”", () => {
    expect(perguntasSugeridas(false).map((p) => p.tipo)).toEqual(["nota", "texto"]);
  });
  it("título sugerido", () => {
    expect(TITULO_SUGERIDO).toBe("Pesquisa de satisfação");
  });
});
