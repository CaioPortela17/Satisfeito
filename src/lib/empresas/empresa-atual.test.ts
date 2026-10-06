import { describe, expect, it } from "vitest";
import { escolherEmpresaAtual } from "./empresa-atual";

const centro = { id: "11111111-1111-4111-8111-111111111111", nome: "Bebelu Centro" };
const shopping = { id: "22222222-2222-4222-8222-222222222222", nome: "Bebelu Shopping" };

describe("escolherEmpresaAtual", () => {
  it("abre a empresa guardada no cookie quando ela é do usuário", () => {
    expect(escolherEmpresaAtual([centro, shopping], shopping.id)).toEqual(shopping);
  });

  it("abre a primeira (mais antiga) quando não há cookie", () => {
    expect(escolherEmpresaAtual([centro, shopping], undefined)).toEqual(centro);
  });

  it("ignora cookie com empresa que não é do usuário", () => {
    expect(
      escolherEmpresaAtual([centro, shopping], "33333333-3333-4333-8333-333333333333"),
    ).toEqual(centro);
  });

  it("devolve null quando o usuário não tem empresa", () => {
    expect(escolherEmpresaAtual([], centro.id)).toBeNull();
  });
});
