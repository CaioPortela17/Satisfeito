import { describe, expect, it } from "vitest";
import { lerResposta, type PerguntaPublica } from "./formulario";

const NOTA = "11111111-1111-4111-8111-111111111111";
const TEXTO = "22222222-2222-4222-8222-222222222222";
const QUEM = "33333333-3333-4333-8333-333333333333";
const ANA = "44444444-4444-4444-8444-444444444444";

const perguntas: PerguntaPublica[] = [
  { id: NOTA, texto: "Nota?", tipo: "nota", obrigatoria: true },
  { id: TEXTO, texto: "Melhorar?", tipo: "texto", obrigatoria: false },
  { id: QUEM, texto: "Quem?", tipo: "funcionario", obrigatoria: false },
];

function form(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.append(k, v);
  return fd;
}

describe("lerResposta", () => {
  it("monta os itens respondidos e pula os vazios", () => {
    expect(
      lerResposta(form({ [`nota:${NOTA}`]: "9", [`texto:${TEXTO}`]: "  Mais sal  ", [`funcionario:${QUEM}`]: ANA }), perguntas),
    ).toEqual({
      ok: true,
      itens: [
        { pergunta_id: NOTA, valor_nota: 9 },
        { pergunta_id: TEXTO, valor_texto: "Mais sal" },
        { pergunta_id: QUEM, funcionario_id: ANA },
      ],
    });
    expect(lerResposta(form({ [`nota:${NOTA}`]: "7", [`texto:${TEXTO}`]: "   " }), perguntas)).toEqual({
      ok: true,
      itens: [{ pergunta_id: NOTA, valor_nota: 7 }],
    });
  });
  it("obrigatória faltando", () => {
    expect(lerResposta(form({}), perguntas)).toEqual({
      ok: false,
      erros: { [NOTA]: "Responda esta pergunta." },
    });
  });
  it("valores inválidos", () => {
    const r = lerResposta(
      form({ [`nota:${NOTA}`]: "11", [`texto:${TEXTO}`]: "x".repeat(1001), [`funcionario:${QUEM}`]: "ana" }),
      perguntas,
    );
    expect(r).toEqual({
      ok: false,
      erros: {
        [NOTA]: "Escolha uma nota de 1 a 10.",
        [TEXTO]: "Escreva no máximo 1000 caracteres.",
        [QUEM]: "Escolha quem te atendeu.",
      },
    });
    expect(lerResposta(form({ [`nota:${NOTA}`]: "7.5" }), perguntas).ok).toBe(false);
  });
  it("nada respondido numa pesquisa sem obrigatórias", () => {
    expect(lerResposta(form({}), perguntas.slice(1))).toEqual({
      ok: false,
      erros: { geral: "Responda pelo menos uma pergunta." },
    });
  });
});
