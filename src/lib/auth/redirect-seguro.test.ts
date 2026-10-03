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

  it("respeita um padrão diferente", () => {
    expect(caminhoSeguro("https://golpe.com", "/entrar")).toBe("/entrar");
  });
});
