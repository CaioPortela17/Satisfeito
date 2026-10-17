import { describe, expect, it } from "vitest";
import { NUMEROS_EXEMPLO, RESUMO_EXEMPLO } from "./exemplo-numeros";
import { numerosDesconhecidos } from "./validar-numeros";

const com = (extra: Partial<typeof RESUMO_EXEMPLO>) => ({ ...RESUMO_EXEMPLO, ...extra });

describe("numerosDesconhecidos", () => {
  it("o resumo de exemplo não tem número inventado", () => {
    expect(numerosDesconhecidos(RESUMO_EXEMPLO, NUMEROS_EXEMPLO)).toEqual([]);
  });

  it("aceita os números dos dados, em vírgula ou ponto", () => {
    const r = com({ panorama: "A nota foi de 8,4 (antes 8.1) com 48 respostas, contra 36, e NPS 52 (44 antes)." });
    expect(numerosDesconhecidos(r, NUMEROS_EXEMPLO)).toEqual([]);
  });

  it("aceita a diferença entre dois números dos dados", () => {
    const r = com({ panorama: "A nota subiu 0,3 e vieram 12 respostas a mais, com NPS 8 pontos acima." });
    expect(numerosDesconhecidos(r, NUMEROS_EXEMPLO)).toEqual([]);
  });

  it("aceita o período e os números das datas", () => {
    const r = com({ panorama: "Nos últimos 30 dias, de 17/09 a 16/10, foi bom." });
    expect(numerosDesconhecidos(r, NUMEROS_EXEMPLO)).toEqual([]);
  });

  it("aceita inteiros de 0 a 10 (contagens e notas simples)", () => {
    const r = com({ panorama: "Duas ações simples e nota 9 no jantar.", acoes: ["Escolher 3 pratos para testar"] });
    expect(numerosDesconhecidos(r, NUMEROS_EXEMPLO)).toEqual([]);
  });

  it("recusa número com casa decimal que não está nos dados", () => {
    expect(numerosDesconhecidos(com({ panorama: "A nota subiu para 9,7." }), NUMEROS_EXEMPLO)).toEqual(["9,7"]);
  });

  it("recusa inteiro acima de 10 que não está nos dados (inclusive porcentagem)", () => {
    expect(numerosDesconhecidos(com({ acoes: ["Chegar a 25% de promotores"] }), NUMEROS_EXEMPLO)).toEqual(["25"]);
    expect(numerosDesconhecidos(com({ panorama: "Vieram 63 respostas." }), NUMEROS_EXEMPLO)).toEqual(["63"]);
  });

  it("as listas de elogio, reclamação e sugestão não são conferidas (vêm de comentários)", () => {
    const r = com({ reclamacoes: ["Esperei 40 minutos na fila"], positivos: ["Nota 9,5 no atendimento"] });
    expect(numerosDesconhecidos(r, NUMEROS_EXEMPLO)).toEqual([]);
  });

  it("números da equipe só valem quando a equipe vem nos dados", () => {
    const r = com({ acoes: ["Reconhecer a Ana, que teve 9,3 de média"] });
    expect(numerosDesconhecidos(r, NUMEROS_EXEMPLO)).toEqual(["9,3"]);
    const comEquipe = { ...NUMEROS_EXEMPLO, equipe: [{ nome: "Ana", media: 9.3, avaliacoes: 14 }] };
    expect(numerosDesconhecidos(r, comEquipe)).toEqual([]);
  });
});
