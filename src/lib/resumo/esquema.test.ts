import { describe, expect, it } from "vitest";
import { ESQUEMA_FERRAMENTA, NOME_FERRAMENTA, esquemaResumo, limparResumo } from "./esquema";

const BOM = {
  panorama: "O período foi bom, com nota estável.",
  notas: "A nota média ficou em 8, com a maioria dos envios entre 9 e 10.",
  positivos: ["Atendimento rápido"],
  reclamacoes: ["Demora no fim de semana"],
  sugestoes: ["Mais opções sem glúten"],
  acoes: ["Reforçar a equipe no fim de semana"],
};

describe("limparResumo", () => {
  it("aceita um resumo bom", () => {
    expect(limparResumo(BOM)).toEqual(BOM);
  });
  it("aceita listas vazias", () => {
    const vazio = { ...BOM, positivos: [], reclamacoes: [], sugestoes: [] };
    expect(limparResumo(vazio)).toEqual(vazio);
  });
  it("tira espaços e descarta frases vazias", () => {
    expect(limparResumo({ ...BOM, positivos: ["  ok  ", "", "   "] })?.positivos).toEqual(["ok"]);
  });
  it("corta frases longas em 200 caracteres", () => {
    const longa = "a".repeat(300);
    const r = limparResumo({ ...BOM, sugestoes: [longa] });
    expect(r?.sugestoes[0].length).toBe(200);
    expect(r?.sugestoes[0].endsWith("…")).toBe(true);
  });
  it("corte no meio de um emoji não deixa metade solta", () => {
    const emoji = "\u{1F600}"; // 2 unidades: ocupa as posições 198 e 199
    const frase = "a".repeat(198) + emoji + "b".repeat(100);
    const s = limparResumo({ ...BOM, positivos: [frase] })?.positivos[0] ?? "";
    expect(s.length).toBeLessThanOrEqual(200);
    expect(s.endsWith("…")).toBe(true);
    expect(s).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/);
  });
  it("corte logo depois de um espaço não deixa espaço antes do …", () => {
    const frase = "a".repeat(198) + " " + "b".repeat(100);
    const s = limparResumo({ ...BOM, positivos: [frase] })?.positivos[0] ?? "";
    expect(s).toBe("a".repeat(198) + "…");
  });
  it("mantém só as 6 primeiras frases de cada lista", () => {
    const sete = ["1", "2", "3", "4", "5", "6", "7"];
    expect(limparResumo({ ...BOM, positivos: sete })?.positivos).toEqual(["1", "2", "3", "4", "5", "6"]);
  });
  it("recusa campo faltando, tipo errado e itens que não são texto", () => {
    expect(limparResumo({ positivos: [], reclamacoes: [] })).toBeNull();
    expect(limparResumo({ ...BOM, positivos: "texto solto" })).toBeNull();
    expect(limparResumo({ ...BOM, positivos: [1, 2] })).toBeNull();
    expect(limparResumo(null)).toBeNull();
    expect(limparResumo("oi")).toBeNull();
    expect(limparResumo([])).toBeNull();
  });
  it("tira NUL e metade solta de emoji, mas mantém emoji inteiro", () => {
    const r = limparResumo({ ...BOM, positivos: ["ab\u0000cd\ud83def", "bom \u{1F600}"] });
    expect(r?.positivos).toEqual(["abcdef", "bom \u{1F600}"]);
  });
  it("o resultado sempre passa no zod", () => {
    const r = limparResumo({ ...BOM, positivos: ["x".repeat(500), "y"] });
    expect(esquemaResumo.safeParse(r).success).toBe(true);
  });
});

describe("ferramenta", () => {
  it("o esquema da ferramenta pede panorama, notas, as três listas e as ações", () => {
    expect(NOME_FERRAMENTA).toBe("registrar_resumo");
    expect(ESQUEMA_FERRAMENTA.type).toBe("object");
    expect(ESQUEMA_FERRAMENTA.required).toEqual(["panorama", "notas", "positivos", "reclamacoes", "sugestoes", "acoes"]);
    expect(Object.keys(ESQUEMA_FERRAMENTA.properties)).toEqual(["panorama", "notas", "positivos", "reclamacoes", "sugestoes", "acoes"]);
  });
  it("panorama e ações são obrigatórios; panorama vazio ou fora de texto é recusado", () => {
    const { panorama: _p, ...semPanorama } = BOM;
    void _p;
    const { acoes: _a, ...semAcoes } = BOM;
    void _a;
    expect(limparResumo(semPanorama)).toBeNull();
    expect(limparResumo(semAcoes)).toBeNull();
    expect(limparResumo({ ...BOM, panorama: "   " })).toBeNull();
    expect(limparResumo({ ...BOM, panorama: 5 })).toBeNull();
    expect(limparResumo({ ...BOM, acoes: "fazer algo" })).toBeNull();
  });
  it("corta o panorama em 400 caracteres e mantém no máximo 3 ações", () => {
    const r = limparResumo({ ...BOM, panorama: "p".repeat(500), acoes: ["1", "2", "3", "4"] });
    expect(r?.panorama.length).toBe(400);
    expect(r?.panorama.endsWith("…")).toBe(true);
    expect(r?.acoes).toEqual(["1", "2", "3"]);
  });
  it("o comentário sobre as notas é obrigatório e vai até 500 caracteres", () => {
    const { notas: _n, ...semNotas } = BOM;
    void _n;
    expect(limparResumo(semNotas)).toBeNull();
    expect(limparResumo({ ...BOM, notas: "  " })).toBeNull();
    const r = limparResumo({ ...BOM, notas: "n".repeat(600) });
    expect(r?.notas.length).toBe(500);
    expect(r?.notas.endsWith("…")).toBe(true);
  });
  it("aceita nenhuma ação (lista vazia)", () => {
    expect(limparResumo({ ...BOM, acoes: [] })?.acoes).toEqual([]);
  });
});
