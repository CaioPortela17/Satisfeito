import { describe, expect, it } from "vitest";
import { lerResposta, type PerguntaPublica } from "./formulario";

const NOTA = "11111111-1111-4111-8111-111111111111";
const TEXTO = "22222222-2222-4222-8222-222222222222";

const perguntas: PerguntaPublica[] = [
  { id: NOTA, texto: "Nota?", tipo: "nota", obrigatoria: false },
  { id: TEXTO, texto: "Melhorar?", tipo: "texto", obrigatoria: false },
];

function form(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.append(k, v);
  return fd;
}

describe("lerResposta", () => {
  it("monta os itens respondidos e pula os vazios", () => {
    expect(
      lerResposta(form({ [`nota:${NOTA}`]: "9", [`texto:${TEXTO}`]: "  Mais sal  " }), perguntas),
    ).toEqual({
      ok: true,
      itens: [
        { pergunta_id: NOTA, valor_nota: 9 },
        { pergunta_id: TEXTO, valor_texto: "Mais sal" },
      ],
    });
    expect(lerResposta(form({ [`nota:${NOTA}`]: "7", [`texto:${TEXTO}`]: "   " }), perguntas)).toEqual({
      ok: true,
      itens: [{ pergunta_id: NOTA, valor_nota: 7 }],
    });
  });
  it("nota abaixo de 7 guarda o texto 'onde melhorar' junto da nota", () => {
    expect(lerResposta(form({ [`nota:${NOTA}`]: "6", [`melhorar:${NOTA}`]: "  Demorou  " }), perguntas)).toEqual({
      ok: true,
      itens: [{ pergunta_id: NOTA, valor_nota: 6, valor_texto: "Demorou" }],
    });
    expect(lerResposta(form({ [`nota:${NOTA}`]: "6", [`melhorar:${NOTA}`]: "  " }), perguntas)).toEqual({
      ok: true,
      itens: [{ pergunta_id: NOTA, valor_nota: 6 }],
    });
  });
  it("nota 7 ou mais ignora o texto 'onde melhorar'", () => {
    expect(lerResposta(form({ [`nota:${NOTA}`]: "7", [`melhorar:${NOTA}`]: "Demorou" }), perguntas)).toEqual({
      ok: true,
      itens: [{ pergunta_id: NOTA, valor_nota: 7 }],
    });
  });
  it("texto 'onde melhorar' grande demais", () => {
    expect(lerResposta(form({ [`nota:${NOTA}`]: "3", [`melhorar:${NOTA}`]: "a".repeat(1001) }), perguntas)).toEqual({
      ok: false,
      erros: { [NOTA]: "Escreva no máximo 1000 caracteres." },
    });
  });
  it("perguntas em branco são puladas, nenhuma é obrigatória", () => {
    expect(lerResposta(form({ [`texto:${TEXTO}`]: "Mais sal" }), perguntas)).toEqual({
      ok: true,
      itens: [{ pergunta_id: TEXTO, valor_texto: "Mais sal" }],
    });
  });
  it("valores inválidos", () => {
    const r = lerResposta(
      form({ [`nota:${NOTA}`]: "11", [`texto:${TEXTO}`]: "x".repeat(1001) }),
      perguntas,
    );
    expect(r).toEqual({
      ok: false,
      erros: {
        [NOTA]: "Escolha uma nota de 1 a 10.",
        [TEXTO]: "Escreva no máximo 1000 caracteres.",
      },
    });
    expect(lerResposta(form({ [`nota:${NOTA}`]: "7.5" }), perguntas).ok).toBe(false);
  });
  it("nada respondido", () => {
    expect(lerResposta(form({}), perguntas)).toEqual({
      ok: false,
      erros: { geral: "Responda pelo menos uma pergunta." },
    });
  });
});
