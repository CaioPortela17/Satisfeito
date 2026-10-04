import { describe, expect, it } from "vitest";
import { caminhoSeguro } from "./redirect-seguro";

describe("caminhoSeguro", () => {
  it("aceita caminhos internos", () => {
    expect(caminhoSeguro("/painel")).toBe("/painel");
    expect(caminhoSeguro("/redefinir-senha")).toBe("/redefinir-senha");
  });

  it("usa o padrão quando não há destino", () => {
    expect(caminhoSeguro(null)).toBe("/painel");
    expect(caminhoSeguro(undefined)).toBe("/painel");
    expect(caminhoSeguro("")).toBe("/painel");
  });

  it("bloqueia sites externos", () => {
    expect(caminhoSeguro("https://golpe.com")).toBe("/painel");
    expect(caminhoSeguro("//golpe.com")).toBe("/painel");
    expect(caminhoSeguro("/\\golpe.com")).toBe("/painel");
    expect(caminhoSeguro("javascript:alert(1)")).toBe("/painel");
  });

  it("bloqueia caracteres invisíveis que o navegador apaga (tab, quebra de linha)", () => {
    // O navegador remove \t, \n e \r: "/\t/golpe.com" vira "//golpe.com" (outro site)
    expect(caminhoSeguro("/\t/golpe.com")).toBe("/painel");
    expect(caminhoSeguro("/\n/golpe.com")).toBe("/painel");
    expect(caminhoSeguro("/\r/golpe.com")).toBe("/painel");
    expect(caminhoSeguro("/\t\\golpe.com")).toBe("/painel");
  });

  it("mantém busca e âncora de caminhos internos", () => {
    expect(caminhoSeguro("/painel?aba=resumo#topo")).toBe("/painel?aba=resumo#topo");
  });

  it("respeita um padrão diferente", () => {
    expect(caminhoSeguro("https://golpe.com", "/entrar")).toBe("/entrar");
  });
});
