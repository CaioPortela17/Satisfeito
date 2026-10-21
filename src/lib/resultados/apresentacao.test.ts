import { describe, expect, it } from "vitest";
import {
  escolherPesquisaPadrao,
  formatarMedia,
  rotuloDia,
  rotuloFaixa,
} from "./apresentacao";

describe("formatarMedia", () => {
  it("usa vírgula e uma casa decimal", () => {
    expect(formatarMedia(8.4)).toBe("8,4");
    expect(formatarMedia(8)).toBe("8,0");
    expect(formatarMedia(6.666)).toBe("6,7");
  });
  it("sem média vira travessão", () => {
    expect(formatarMedia(null)).toBe("—");
  });
});

describe("rotuloFaixa", () => {
  it("dá a palavra de cada faixa", () => {
    expect(rotuloFaixa(9)).toBe("Ótimo");
    expect(rotuloFaixa(8)).toBe("Ótimo");
    expect(rotuloFaixa(7)).toBe("Pode melhorar");
    expect(rotuloFaixa(6)).toBe("Pode melhorar");
    expect(rotuloFaixa(5.9)).toBe("Ruim");
  });
});

describe("rotuloDia", () => {
  it("vira dia/mês", () => {
    expect(rotuloDia("2026-10-08")).toBe("08/10");
  });
});

describe("escolherPesquisaPadrao", () => {
  const lista = [
    { id: "nova", respostas: 0 },
    { id: "meio", respostas: 4 },
    { id: "velha", respostas: 9 },
  ];
  it("usa a pedida quando ela é da empresa", () => {
    expect(escolherPesquisaPadrao(lista, "velha")).toBe("velha");
  });
  it("ignora pedido que não é da empresa e usa a mais recente com respostas", () => {
    expect(escolherPesquisaPadrao(lista, "de-outro")).toBe("meio");
    expect(escolherPesquisaPadrao(lista, null)).toBe("meio");
    expect(escolherPesquisaPadrao(lista)).toBe("meio");
  });
  it("sem nenhuma resposta usa a mais recente", () => {
    expect(escolherPesquisaPadrao([{ id: "a", respostas: 0 }, { id: "b", respostas: 0 }])).toBe("a");
  });
  it("sem pesquisas devolve null", () => {
    expect(escolherPesquisaPadrao([])).toBeNull();
  });
});
