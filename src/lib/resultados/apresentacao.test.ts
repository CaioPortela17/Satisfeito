import { describe, expect, it } from "vitest";
import {
  escolherPesquisaPadrao,
  formatarMedia,
  ordenarEquipe,
  poucasAvaliacoes,
  rotuloDia,
  rotuloFaixa,
} from "./apresentacao";
import type { MembroEquipe } from "./tipos";

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

describe("poucasAvaliacoes", () => {
  it("menos de 3 é pouco", () => {
    expect(poucasAvaliacoes(2)).toBe(true);
    expect(poucasAvaliacoes(3)).toBe(false);
  });
});

describe("ordenarEquipe", () => {
  const m = (nome: string, media: number, avaliacoes: number): MembroEquipe => ({
    id: nome, nome, ativo: true, media, avaliacoes,
  });

  it("quem tem 3 ou mais avaliações vem antes, mesmo com média menor", () => {
    const r = ordenarEquipe([m("Pouca", 10, 1), m("Firme", 7, 5)]);
    expect(r.map((x) => x.nome)).toEqual(["Firme", "Pouca"]);
  });
  it("dentro do grupo: maior média primeiro, empate pelo maior número de avaliações, depois pelo nome", () => {
    const r = ordenarEquipe([m("Caio", 8, 4), m("Ana", 8, 9), m("Bia", 9, 3), m("Abel", 8, 4)]);
    expect(r.map((x) => x.nome)).toEqual(["Bia", "Ana", "Abel", "Caio"]);
  });
  it("não altera a lista original", () => {
    const original = [m("B", 5, 3), m("A", 9, 3)];
    ordenarEquipe(original);
    expect(original.map((x) => x.nome)).toEqual(["B", "A"]);
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
