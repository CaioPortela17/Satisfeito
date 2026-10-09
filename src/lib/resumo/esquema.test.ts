import { describe, expect, it } from "vitest";
import { ESQUEMA_FERRAMENTA, NOME_FERRAMENTA, esquemaResumo, limparResumo } from "./esquema";

const BOM = { positivos: ["Atendimento rápido"], reclamacoes: ["Demora no fim de semana"], sugestoes: ["Mais opções sem glúten"] };

describe("limparResumo", () => {
  it("aceita um resumo bom", () => {
    expect(limparResumo(BOM)).toEqual(BOM);
  });
  it("aceita listas vazias", () => {
    const vazio = { positivos: [], reclamacoes: [], sugestoes: [] };
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
  it("o resultado sempre passa no zod", () => {
    const r = limparResumo({ ...BOM, positivos: ["x".repeat(500), "y"] });
    expect(esquemaResumo.safeParse(r).success).toBe(true);
  });
});

describe("ferramenta", () => {
  it("o esquema da ferramenta pede as três listas", () => {
    expect(NOME_FERRAMENTA).toBe("registrar_resumo");
    expect(ESQUEMA_FERRAMENTA.type).toBe("object");
    expect(ESQUEMA_FERRAMENTA.required).toEqual(["positivos", "reclamacoes", "sugestoes"]);
    expect(Object.keys(ESQUEMA_FERRAMENTA.properties)).toEqual(["positivos", "reclamacoes", "sugestoes"]);
  });
});
