import { describe, expect, it } from "vitest";
import { passosDoPainel, tudoPronto } from "./primeiros-passos";

describe("passosDoPainel", () => {
  it("empresa nova: nenhum passo feito, com os convites de sempre", () => {
    const p = passosDoPainel({ pesquisas: 0, respostas: 0 });
    expect(p.map((x) => x.feito)).toEqual([false, false]);
    expect(p.map((x) => x.acao)).toEqual(["Montar pesquisa", "Ver link e QR code"]);
    expect(tudoPronto(p)).toBe(false);
  });

  it("cada passo é marcado pelo que a empresa já tem", () => {
    expect(passosDoPainel({ pesquisas: 1, respostas: 0 }).map((x) => x.feito)).toEqual([true, false]);
    expect(passosDoPainel({ pesquisas: 1, respostas: 3 }).map((x) => x.feito)).toEqual([true, true]);
  });

  it("passo feito troca o texto do link; o do QR code passa a levar aos Resultados", () => {
    const p = passosDoPainel({ pesquisas: 1, respostas: 1 });
    expect(p.map((x) => x.acao)).toEqual(["Ver pesquisas", "Ver resultados"]);
    expect(p[1].href).toBe("/painel/resultados");
    expect(tudoPronto(p)).toBe(true);
  });

  it("sem resposta ainda, o passo do QR code leva às pesquisas (onde ficam o link e o cartaz)", () => {
    expect(passosDoPainel({ pesquisas: 1, respostas: 0 })[1].href).toBe("/painel/pesquisas");
  });
});
