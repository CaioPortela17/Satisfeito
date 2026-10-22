import { describe, expect, it } from "vitest";
import { montarLinhasRespostas, type PerguntaExportar, type RespostaExportar } from "./respostas";

const PERGUNTAS: PerguntaExportar[] = [
  { id: "p3", texto: "Quer nos contar mais?", tipo: "texto", ordem: 3, arquivada: false },
  { id: "p1", texto: "Atendimento?", tipo: "nota", ordem: 1, arquivada: false },
  // Perguntas tiradas da pesquisa (arquivadas) e as antigas de funcionário não viram coluna
  { id: "p2", texto: "Quem atendeu?", tipo: "funcionario", ordem: 2, arquivada: true },
  { id: "p0", texto: "Antiga?", tipo: "nota", ordem: 4, arquivada: true },
];

const resposta = (id: string, extra: Partial<RespostaExportar> = {}): RespostaExportar => ({
  id,
  created_at: "2026-10-17T15:30:00.000Z",
  descartada: false,
  respostas_itens: [
    { pergunta_id: "p1", valor_nota: 9, valor_texto: null },
    { pergunta_id: "p3", valor_nota: null, valor_texto: "Tudo ótimo" },
  ],
  ...extra,
});

describe("montarLinhasRespostas", () => {
  it("cabeçalho só com as perguntas que estão valendo, em ordem", () => {
    const [cab] = montarLinhasRespostas(PERGUNTAS, [], new Set(), "todas");
    expect(cab).toEqual(["Data e hora", "Situação", "Média das notas", "Atendimento?", "Quer nos contar mais?"]);
  });

  it("uma linha por resposta: nota e texto nas colunas certas", () => {
    const linhas = montarLinhasRespostas(PERGUNTAS, [resposta("r1")], new Set(), "todas");
    expect(linhas).toHaveLength(2);
    expect(linhas[1].slice(1)).toEqual(["Normal", "9,0", 9, "Tudo ótimo"]);
    expect(String(linhas[1][0])).toMatch(/17\/10\/2026/);
  });

  it("marca suspeitas e descartadas; cada aba filtra o seu grupo", () => {
    const rs = [resposta("a"), resposta("b"), resposta("c", { descartada: true })];
    const susp = new Set(["b", "c"]);
    const situacoes = (aba: "todas" | "suspeitas" | "descartadas") =>
      montarLinhasRespostas(PERGUNTAS, rs, susp, aba)
        .slice(1)
        .map((l) => l[1]);
    expect(situacoes("todas")).toEqual(["Normal", "Suspeita", "Descartada"]);
    expect(situacoes("suspeitas")).toEqual(["Suspeita"]);
    expect(situacoes("descartadas")).toEqual(["Descartada"]);
  });

  it("a média usa só as perguntas de nota que aparecem na planilha; sem nota fica vazia", () => {
    const duas = resposta("x", {
      respostas_itens: [
        { pergunta_id: "p1", valor_nota: 8, valor_texto: null },
        { pergunta_id: "p0", valor_nota: 3, valor_texto: null }, // pergunta tirada: não entra na média da planilha
      ],
    });
    const soTexto = resposta("y", { respostas_itens: [{ pergunta_id: "p3", valor_nota: null, valor_texto: "oi" }] });
    const linhas = montarLinhasRespostas(PERGUNTAS, [duas, soTexto], new Set(), "todas");
    expect(linhas[1][2]).toBe("8,0");
    expect(linhas[2][2]).toBe("");
  });

  it("comentário \"onde podemos melhorar\" (texto junto da nota) ganha uma coluna ao lado da nota", () => {
    const comComentario = resposta("z", {
      respostas_itens: [
        { pergunta_id: "p1", valor_nota: 4, valor_texto: "Demorou para atender" },
        { pergunta_id: "p3", valor_nota: null, valor_texto: "Mais mesas" },
      ],
    });
    const [cab, linha, normal] = montarLinhasRespostas(PERGUNTAS, [comComentario, resposta("w")], new Set(), "todas");
    expect(cab).toEqual(["Data e hora", "Situação", "Média das notas", "Atendimento?", "Atendimento? (comentário)", "Quer nos contar mais?"]);
    expect(linha.slice(3)).toEqual([4, "Demorou para atender", "Mais mesas"]);
    expect(normal.slice(3)).toEqual([9, "", "Tudo ótimo"]);
  });
});
