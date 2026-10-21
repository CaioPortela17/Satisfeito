import { describe, expect, it } from "vitest";
import {
  esquemaIdPesquisa,
  esquemaTextoPergunta,
  esquemaTipoPergunta,
  esquemaTituloPesquisa,
  mensagemErroPesquisa,
} from "./esquemas";

describe("esquemaTituloPesquisa", () => {
  it("limpa espaços das pontas", () => {
    expect(esquemaTituloPesquisa.parse("  Mesa  ")).toBe("Mesa");
  });
  it("recusa vazio", () => {
    expect(esquemaTituloPesquisa.safeParse("  ").error?.issues[0].message).toBe(
      "Dê um nome para a pesquisa.",
    );
  });
  it("aceita 80 e recusa 81 caracteres", () => {
    expect(esquemaTituloPesquisa.safeParse("a".repeat(80)).success).toBe(true);
    expect(esquemaTituloPesquisa.safeParse("a".repeat(81)).error?.issues[0].message).toBe(
      "O nome pode ter no máximo 80 caracteres.",
    );
  });
});

describe("esquemaTextoPergunta", () => {
  it("recusa vazio", () => {
    expect(esquemaTextoPergunta.safeParse("").error?.issues[0].message).toBe(
      "Escreva a pergunta.",
    );
  });
  it("aceita 120 e recusa 121 caracteres", () => {
    expect(esquemaTextoPergunta.safeParse("a".repeat(120)).success).toBe(true);
    expect(esquemaTextoPergunta.safeParse("a".repeat(121)).error?.issues[0].message).toBe(
      "A pergunta pode ter no máximo 120 caracteres.",
    );
  });
});

describe("esquemaTipoPergunta", () => {
  it("aceita nota e texto e recusa outros (inclusive o antigo \"funcionario\")", () => {
    for (const tipo of ["nota", "texto"]) {
      expect(esquemaTipoPergunta.safeParse(tipo).success).toBe(true);
    }
    expect(esquemaTipoPergunta.safeParse("funcionario").success).toBe(false);
    expect(esquemaTipoPergunta.safeParse("estrelas").error?.issues[0].message).toBe(
      "Escolha o tipo da pergunta.",
    );
  });
});

describe("esquemaIdPesquisa", () => {
  it("aceita uuid e recusa outras coisas", () => {
    expect(esquemaIdPesquisa.safeParse("3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b").success).toBe(true);
    expect(esquemaIdPesquisa.safeParse("abc").success).toBe(false);
  });
});

describe("mensagemErroPesquisa", () => {
  it("traduz o limite de perguntas (SF001)", () => {
    expect(mensagemErroPesquisa("SF001")).toBe(
      "Pesquisas curtas recebem mais respostas. O limite é 10 perguntas.",
    );
  });
  it("traduz pesquisa com respostas (23503)", () => {
    expect(mensagemErroPesquisa("23503")).toBe("Essa pesquisa já tem respostas. Pause em vez de excluir.");
  });
  it("usa mensagem genérica nos outros casos", () => {
    expect(mensagemErroPesquisa("42501")).toBe("Algo deu errado. Tente de novo em instantes.");
    expect(mensagemErroPesquisa()).toBe("Algo deu errado. Tente de novo em instantes.");
  });
});
