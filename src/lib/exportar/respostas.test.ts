import { describe, expect, it } from "vitest";
import { montarLinhasRespostas, type PerguntaExportar, type RespostaExportar } from "./respostas";

const PERGUNTAS: PerguntaExportar[] = [
  { id: "p3", texto: "Onde melhorar?", tipo: "texto", ordem: 3, arquivada: false },
  { id: "p1", texto: "Atendimento?", tipo: "nota", ordem: 1, arquivada: false },
  { id: "p2", texto: "Quem atendeu?", tipo: "funcionario", ordem: 2, arquivada: false },
  { id: "p0", texto: "Antiga?", tipo: "nota", ordem: 4, arquivada: true },
];
const NOMES = new Map([["f1", "Ana"]]);

const resposta = (id: string, extra: Partial<RespostaExportar> = {}): RespostaExportar => ({
  id,
  created_at: "2026-10-17T15:30:00.000Z",
  descartada: false,
  respostas_itens: [
    { pergunta_id: "p1", valor_nota: 9, valor_texto: null, funcionario_id: null },
    { pergunta_id: "p2", valor_nota: null, valor_texto: null, funcionario_id: "f1" },
    { pergunta_id: "p3", valor_nota: null, valor_texto: "Tudo ótimo", funcionario_id: null },
  ],
  ...extra,
});

describe("montarLinhasRespostas", () => {
  it("cabeçalho em ordem de pergunta, com a arquivada marcada", () => {
    const [cab] = montarLinhasRespostas(PERGUNTAS, [], NOMES, new Set(), "todas");
    expect(cab).toEqual(["Data e hora", "Situação", "Média das notas", "Atendimento?", "Quem atendeu?", "Onde melhorar?", "Antiga? (arquivada)"]);
  });

  it("uma linha por resposta: nota, nome do funcionário e texto nas colunas certas", () => {
    const linhas = montarLinhasRespostas(PERGUNTAS, [resposta("r1")], NOMES, new Set(), "todas");
    expect(linhas).toHaveLength(2);
    expect(linhas[1].slice(1)).toEqual(["Normal", "9,0", 9, "Ana", "Tudo ótimo", ""]);
    expect(String(linhas[1][0])).toMatch(/17\/10\/2026/);
  });

  it("marca suspeitas e descartadas; cada aba filtra o seu grupo", () => {
    const rs = [resposta("a"), resposta("b"), resposta("c", { descartada: true })];
    const susp = new Set(["b", "c"]);
    const situacoes = (aba: "todas" | "suspeitas" | "descartadas") =>
      montarLinhasRespostas(PERGUNTAS, rs, NOMES, susp, aba)
        .slice(1)
        .map((l) => l[1]);
    expect(situacoes("todas")).toEqual(["Normal", "Suspeita", "Descartada"]);
    expect(situacoes("suspeitas")).toEqual(["Suspeita"]);
    expect(situacoes("descartadas")).toEqual(["Descartada"]);
  });

  it("média com vírgula e uma casa; sem nota fica vazia", () => {
    const duas = resposta("x", {
      respostas_itens: [
        { pergunta_id: "p1", valor_nota: 8, valor_texto: null, funcionario_id: null },
        { pergunta_id: "p0", valor_nota: 9, valor_texto: null, funcionario_id: null },
      ],
    });
    const soTexto = resposta("y", { respostas_itens: [{ pergunta_id: "p3", valor_nota: null, valor_texto: "oi", funcionario_id: null }] });
    const linhas = montarLinhasRespostas(PERGUNTAS, [duas, soTexto], NOMES, new Set(), "todas");
    expect(linhas[1][2]).toBe("8,5");
    expect(linhas[2][2]).toBe("");
  });

  it("funcionário apagado ou desconhecido vira vazio", () => {
    const r = resposta("z", { respostas_itens: [{ pergunta_id: "p2", valor_nota: null, valor_texto: null, funcionario_id: "f9" }] });
    expect(montarLinhasRespostas(PERGUNTAS, [r], NOMES, new Set(), "todas")[1][4]).toBe("");
  });
});
