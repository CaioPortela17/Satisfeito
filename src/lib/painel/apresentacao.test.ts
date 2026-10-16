import { describe, expect, it } from "vitest";
import {
  MIN_CELULA,
  MIN_COMPARACAO,
  MIN_NPS,
  extremos,
  nomeDia,
  percentual,
  rotuloNps,
  rotuloTurno,
  textoVariacao,
  variacaoContagem,
  variacaoMedia,
  variacaoNps,
} from "./apresentacao";

describe("constantes", () => {
  it("têm os valores combinados", () => {
    expect(MIN_COMPARACAO).toBe(5);
    expect(MIN_CELULA).toBe(3);
    expect(MIN_NPS).toBe(10);
  });
});

describe("variacaoMedia", () => {
  it("sobe e desce com uma casa", () => {
    expect(variacaoMedia(8.4, 8.1, 20, 20)).toEqual({ tipo: "sobe", diferenca: 0.3 });
    expect(variacaoMedia(7.0, 7.5, 20, 20)).toEqual({ tipo: "desce", diferenca: 0.5 });
  });
  it("diferença menor que 0,05 é igual", () => {
    expect(variacaoMedia(8.0, 8.0, 20, 20)).toEqual({ tipo: "igual" });
    expect(variacaoMedia(8.04, 8.0, 20, 20)).toEqual({ tipo: "igual" });
  });
  it("com menos de 5 envios em qualquer dos dois períodos: poucos dados", () => {
    expect(variacaoMedia(8, 7, 4, 20)).toEqual({ tipo: "poucos-dados" });
    expect(variacaoMedia(8, 7, 20, 4)).toEqual({ tipo: "poucos-dados" });
    expect(variacaoMedia(8, 7, 5, 5)).toEqual({ tipo: "sobe", diferenca: 1 });
  });
  it("sem média em um dos lados: poucos dados", () => {
    expect(variacaoMedia(null, 7, 20, 20)).toEqual({ tipo: "poucos-dados" });
    expect(variacaoMedia(7, null, 20, 20)).toEqual({ tipo: "poucos-dados" });
  });
});

describe("variacaoContagem", () => {
  it("compara totais de envios", () => {
    expect(variacaoContagem(48, 36)).toEqual({ tipo: "sobe", diferenca: 12 });
    expect(variacaoContagem(30, 36)).toEqual({ tipo: "desce", diferenca: 6 });
    expect(variacaoContagem(10, 10)).toEqual({ tipo: "igual" });
  });
  it("com menos de 5 envios no período anterior ou no atual: poucos dados", () => {
    expect(variacaoContagem(48, 4)).toEqual({ tipo: "poucos-dados" });
    expect(variacaoContagem(4, 48)).toEqual({ tipo: "poucos-dados" });
  });
});

describe("variacaoNps", () => {
  it("precisa de NPS nos dois períodos", () => {
    expect(variacaoNps(52, 44)).toEqual({ tipo: "sobe", diferenca: 8 });
    expect(variacaoNps(40, 44)).toEqual({ tipo: "desce", diferenca: 4 });
    expect(variacaoNps(40, 40)).toEqual({ tipo: "igual" });
    expect(variacaoNps(null, 44)).toEqual({ tipo: "poucos-dados" });
    expect(variacaoNps(52, null)).toEqual({ tipo: "poucos-dados" });
  });
});

describe("textoVariacao", () => {
  it("escreve a variação por tipo de número", () => {
    expect(textoVariacao({ tipo: "sobe", diferenca: 0.3 }, "media")).toBe("0,3 a mais que no período anterior");
    expect(textoVariacao({ tipo: "desce", diferenca: 0.5 }, "media")).toBe("0,5 a menos que no período anterior");
    expect(textoVariacao({ tipo: "sobe", diferenca: 12 }, "contagem")).toBe("12 a mais que no período anterior");
    expect(textoVariacao({ tipo: "desce", diferenca: 1 }, "contagem")).toBe("1 a menos que no período anterior");
    expect(textoVariacao({ tipo: "sobe", diferenca: 8 }, "nps")).toBe("8 pontos a mais que no período anterior");
    expect(textoVariacao({ tipo: "desce", diferenca: 1 }, "nps")).toBe("1 ponto a menos que no período anterior");
  });
  it("igual e poucos dados", () => {
    expect(textoVariacao({ tipo: "igual" }, "media")).toBe("Igual ao período anterior");
    expect(textoVariacao({ tipo: "poucos-dados" }, "media")).toBe("Poucos dados para comparar");
  });
});

describe("rotuloNps", () => {
  it("usa as zonas conhecidas do NPS", () => {
    expect(rotuloNps(100)).toBe("Excelente");
    expect(rotuloNps(75)).toBe("Excelente");
    expect(rotuloNps(74)).toBe("Muito bom");
    expect(rotuloNps(50)).toBe("Muito bom");
    expect(rotuloNps(49)).toBe("Razoável");
    expect(rotuloNps(0)).toBe("Razoável");
    expect(rotuloNps(-1)).toBe("Crítico");
    expect(rotuloNps(-100)).toBe("Crítico");
  });
});

describe("nomes", () => {
  it("dias da semana: 1 = segunda, 7 = domingo", () => {
    expect(nomeDia(1)).toBe("segunda-feira");
    expect(nomeDia(3)).toBe("quarta-feira");
    expect(nomeDia(6)).toBe("sábado");
    expect(nomeDia(7)).toBe("domingo");
  });
  it("turnos com o horário escrito", () => {
    expect(rotuloTurno("manha")).toBe("Manhã (6h às 12h)");
    expect(rotuloTurno("tarde")).toBe("Tarde (12h às 18h)");
    expect(rotuloTurno("noite")).toBe("Noite (18h à meia-noite)");
    expect(rotuloTurno("madrugada")).toBe("Madrugada (meia-noite às 6h)");
  });
});

describe("percentual", () => {
  it("arredonda e protege contra total zero", () => {
    expect(percentual(1, 3)).toBe(33);
    expect(percentual(2, 3)).toBe(67);
    expect(percentual(5, 10)).toBe(50);
    expect(percentual(0, 0)).toBe(0);
  });
});

describe("extremos", () => {
  it("acha melhor e pior entre os que têm 3 envios ou mais", () => {
    const itens = [
      { media: 8.0, envios: 5 },
      { media: 6.1, envios: 4 },
      { media: 9.5, envios: 2 }, // poucos dados: fora
      { media: null, envios: 0 },
    ];
    expect(extremos(itens)).toEqual({ melhor: 0, pior: 1 });
  });
  it("sem dois itens confiáveis ou com todos iguais: ninguém é destaque", () => {
    expect(extremos([{ media: 8, envios: 5 }])).toEqual({ melhor: null, pior: null });
    expect(extremos([{ media: 8, envios: 5 }, { media: 8, envios: 9 }])).toEqual({ melhor: null, pior: null });
    expect(extremos([])).toEqual({ melhor: null, pior: null });
  });
  it("empate no topo fica com o primeiro da lista", () => {
    const itens = [
      { media: 7, envios: 3 },
      { media: 9, envios: 3 },
      { media: 9, envios: 4 },
      { media: 5, envios: 3 },
    ];
    expect(extremos(itens)).toEqual({ melhor: 1, pior: 3 });
  });
});
