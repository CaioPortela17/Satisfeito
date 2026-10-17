import { describe, expect, it } from "vitest";
import { escaparCelula, montarCsv } from "./csv";

describe("escaparCelula", () => {
  it("texto simples fica como está; vazio e nulo viram vazio", () => {
    expect(escaparCelula("Adorei")).toBe("Adorei");
    expect(escaparCelula(null)).toBe("");
    expect(escaparCelula(undefined)).toBe("");
    expect(escaparCelula(8)).toBe("8");
    expect(escaparCelula(false)).toBe("false");
  });
  it("coloca entre aspas o que tem ; aspas ou quebra de linha, dobrando as aspas", () => {
    expect(escaparCelula("a;b")).toBe('"a;b"');
    expect(escaparCelula('disse "oi"')).toBe('"disse ""oi"""');
    expect(escaparCelula("linha 1\nlinha 2")).toBe('"linha 1\nlinha 2"');
  });
  it("vírgula e apóstrofo comuns não precisam de aspas", () => {
    expect(escaparCelula("bom, rápido")).toBe("bom, rápido");
    expect(escaparCelula("d'água")).toBe("d'água");
  });
  it("bloqueia fórmulas: texto que começa com = + - @ ganha apóstrofo", () => {
    expect(escaparCelula('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(escaparCelula("+55 11 99999")).toBe("'+55 11 99999");
    expect(escaparCelula("-2+3")).toBe("'-2+3");
    expect(escaparCelula("@usuario")).toBe("'@usuario");
  });
  it("número negativo de verdade (não texto) não ganha apóstrofo", () => {
    expect(escaparCelula(-1)).toBe("-1");
  });
});

describe("montarCsv", () => {
  it("usa ; , CRLF, BOM no começo e quebra de linha no fim", () => {
    const csv = montarCsv([
      ["a", "b"],
      [1, "x;y"],
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('a;b\r\n1;"x;y"\r\n');
  });
});
