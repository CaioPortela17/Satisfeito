import { describe, expect, it } from "vitest";
import { NUMEROS_EXEMPLO, RESUMO_EXEMPLO } from "./exemplo-numeros";
import { montarRelatorioWhatsApp } from "./relatorio";

describe("montarRelatorioWhatsApp", () => {
  it("monta o relatório completo com números do banco e prosa da IA", () => {
    const texto = montarRelatorioWhatsApp(NUMEROS_EXEMPLO, RESUMO_EXEMPLO);
    expect(texto).toBe(
      [
        "*Relatório de satisfação: Pesquisa de satisfação*",
        "Últimos 30 dias (17/09 a 16/10)",
        "",
        "*Panorama*",
        "O mês foi bom: a nota média subiu e mais clientes responderam.",
        "Respostas: 48 (12 a mais que no período anterior)",
        "Nota média: 8,4 (0,3 a mais que no período anterior)",
        "NPS: 52 (8 pontos a mais que no período anterior)",
        "",
        "*Dias e turnos*",
        "Melhor dia: sábado (9,1). Dia mais fraco: segunda-feira (7,2).",
        "Melhor turno: noite (9,1). Turno mais fraco: tarde (7,0).",
        "",
        "*Notas por pergunta*",
        "Mais bem avaliada: Qualidade da comida (9,0)",
        "Mais fraca: Tempo de espera (7,1)",
        "",
        "*O que os clientes elogiaram*",
        "- Atendimento simpático",
        "- Lanche saboroso",
        "",
        "*O que os clientes reclamaram*",
        "- Demora nos fins de semana",
        "",
        "*O que os clientes sugeriram*",
        "- Mais opções sem glúten",
        "",
        "*Ações sugeridas*",
        "- Reforçar a equipe nas tardes de segunda",
        "- Avisar o tempo de espera ao cliente",
      ].join("\n"),
    );
  });

  it("omite seções sem conteúdo", () => {
    const vazio = { ...RESUMO_EXEMPLO, positivos: [], reclamacoes: [], sugestoes: [], acoes: [] };
    const texto = montarRelatorioWhatsApp(NUMEROS_EXEMPLO, vazio);
    expect(texto).not.toContain("elogiaram");
    expect(texto).not.toContain("reclamaram");
    expect(texto).not.toContain("sugeriram");
    expect(texto).not.toContain("Ações sugeridas");
    expect(texto).toContain("*Panorama*");
  });

  it("com poucos dados não mostra variação nem NPS; respostas no singular", () => {
    const pouco = { ...NUMEROS_EXEMPLO, envios: 3, envios_anterior: 2, nps: null, nps_anterior: null, melhor_dia: null, melhor_turno: null, melhor_pergunta: null };
    const texto = montarRelatorioWhatsApp(pouco, RESUMO_EXEMPLO);
    expect(texto).toContain("Respostas: 3\n");
    expect(texto).not.toContain("a mais que no período anterior");
    expect(texto).not.toContain("NPS");
    expect(texto).not.toContain("Dias e turnos");
    expect(texto).not.toContain("Notas por pergunta");
  });

  it("igual ao período anterior e variação para baixo", () => {
    const baixo = { ...NUMEROS_EXEMPLO, media: 7.9, media_anterior: 8.4, envios_anterior: 48 };
    const texto = montarRelatorioWhatsApp(baixo, RESUMO_EXEMPLO);
    expect(texto).toContain("Nota média: 7,9 (0,5 a menos que no período anterior)");
    expect(texto).toContain("Respostas: 48 (igual ao período anterior)");
  });

  it("equipe só aparece quando os números trazem a equipe", () => {
    expect(montarRelatorioWhatsApp(NUMEROS_EXEMPLO, RESUMO_EXEMPLO)).not.toContain("*Equipe*");
    const comEquipe = {
      ...NUMEROS_EXEMPLO,
      equipe: [
        { nome: "Ana", media: 9, avaliacoes: 14 },
        { nome: "Bia", media: 8.2, avaliacoes: 1 },
      ],
    };
    const texto = montarRelatorioWhatsApp(comEquipe, RESUMO_EXEMPLO);
    expect(texto).toContain("*Equipe*\n- Ana: 9,0 (14 avaliações)\n- Bia: 8,2 (1 avaliação)");
  });

  it("sinais de formatação do WhatsApp vindos de fora não viram negrito, itálico ou código", () => {
    const hostil = {
      ...RESUMO_EXEMPLO,
      panorama: "Foi *ótimo* e _muito_ bom ~assim~ `agora`",
      positivos: ["*Seção falsa*"],
    };
    const numeros = { ...NUMEROS_EXEMPLO, pesquisa: "Bebelu *1* _centro_" };
    const texto = montarRelatorioWhatsApp(numeros, hostil);
    expect(texto).toContain("Foi ótimo e muito bom assim agora");
    expect(texto).toContain("- Seção falsa");
    expect(texto).toContain("*Relatório de satisfação: Bebelu 1 centro*");
    // os únicos asteriscos são os dos nossos títulos (2 por título)
    const asteriscos = (texto.match(/\*/g) ?? []).length;
    const titulos = (texto.match(/^\*[^*\n]+\*$/gm) ?? []).length;
    expect(asteriscos).toBe(titulos * 2);
  });

  it("não usa emojis", () => {
    const texto = montarRelatorioWhatsApp(NUMEROS_EXEMPLO, RESUMO_EXEMPLO);
    expect(texto).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
