import { describe, expect, it } from "vitest";
import { candidatosDeSlug, esquemaSlug, gerarSlug } from "./slug";

describe("gerarSlug", () => {
  it("minúsculas, sem acento, hífen no lugar de espaço e símbolos", () => {
    expect(gerarSlug("Bebelu")).toBe("bebelu");
    expect(gerarSlug("Pão de Açúcar & Cia.")).toBe("pao-de-acucar-cia");
    expect(gerarSlug("  Lanchonete   do  Zé  ")).toBe("lanchonete-do-ze");
  });
  it("nome curto ou sem letras vira pesquisa", () => {
    expect(gerarSlug("AB")).toBe("pesquisa-ab");
    expect(gerarSlug(" ++ ")).toBe("pesquisa");
  });
  it("corta em 50 caracteres sem terminar em hífen", () => {
    const slug = gerarSlug("a".repeat(49) + " bcd");
    expect(slug.length).toBeLessThanOrEqual(50);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("candidatosDeSlug", () => {
  it("base, base-2, base-3…", () => {
    expect(candidatosDeSlug("bebelu", 3)).toEqual(["bebelu", "bebelu-2", "bebelu-3"]);
    expect(candidatosDeSlug("bebelu")).toHaveLength(20);
  });
});

describe("esquemaSlug", () => {
  it("aceita e normaliza para minúsculas", () => {
    expect(esquemaSlug.parse(" Bebelu-Centro ")).toBe("bebelu-centro");
  });
  it("recusa formato inválido", () => {
    for (const ruim of ["a b", "-bebelu", "bebelu-", "be--lu", "pão", "ab", "a".repeat(61)]) {
      expect(esquemaSlug.safeParse(ruim).success).toBe(false);
    }
  });
  it("mensagem do formato", () => {
    expect(esquemaSlug.safeParse("a b c").error?.issues[0].message).toBe(
      "Use só letras sem acento, números e hífen (ex.: bebelu-centro).",
    );
  });
});
