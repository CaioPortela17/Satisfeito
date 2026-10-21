import { describe, expect, it } from "vitest";
import type { Painel } from "@/lib/painel/tipos";
import { montarNumeros } from "./numeros";

const PAINEL: Painel = {
  periodo: { dias: 30, inicio: "2026-09-17", fim: "2026-10-16" },
  atual: {
    envios: 48,
    media_geral: 8.4,
    nps: { valor: 52, promotores: 30, neutros: 10, detratores: 5, n: 45 },
    distribuicao: [
      { faixa: "1-3", envios: 2 },
      { faixa: "4-6", envios: 3 },
      { faixa: "7-8", envios: 10 },
      { faixa: "9-10", envios: 33 },
    ],
  },
  anterior: { envios: 36, media_geral: 8.1, nps: { valor: 44, n: 30 } },
  perguntas: [],
  evolucao: [],
  dia_semana: [
    { dia: 1, media: 7.2, envios: 6 },
    { dia: 2, media: 8.0, envios: 7 },
    { dia: 3, media: 8.1, envios: 2 },
    { dia: 4, media: null, envios: 0 },
    { dia: 5, media: 8.5, envios: 8 },
    { dia: 6, media: 9.1, envios: 12 },
    { dia: 7, media: 8.8, envios: 4 },
  ],
  turno: [
    { turno: "manha", media: 8.0, envios: 10 },
    { turno: "tarde", media: 7.0, envios: 12 },
    { turno: "noite", media: 9.1, envios: 20 },
    { turno: "madrugada", media: null, envios: 0 },
  ],
  destaques: {
    melhor_pergunta: { id: "p1", texto: "Comida", media: 9 },
    pior_pergunta: { id: "p2", texto: "Espera", media: 7.1 },
    dia_mais_fraco: { dia: 1, media: 7.2, envios: 6 },
  },
  suspeitas: 0,
};

describe("montarNumeros", () => {
  it("leva a média de cada pergunta (sem as que ninguém respondeu) e a distribuição das notas", () => {
    const painel: Painel = {
      ...PAINEL,
      perguntas: [
        { id: "a", texto: "Comida", ordem: 1, media: 9, respostas: 40, media_anterior: 8.5, respostas_anterior: 30 },
        { id: "b", texto: "Espera", ordem: 2, media: null, respostas: 0, media_anterior: null, respostas_anterior: 0 },
      ],
    };
    const n = montarNumeros(painel, "Pesquisa X");
    expect(n.perguntas).toEqual([{ texto: "Comida", media: 9, respostas: 40, media_anterior: 8.5 }]);
    expect(n.distribuicao).toEqual(PAINEL.atual.distribuicao);
  });
  it("copia os números do painel", () => {
    const n = montarNumeros(PAINEL, "Pesquisa X");
    expect(n.pesquisa).toBe("Pesquisa X");
    expect(n.periodo).toEqual(PAINEL.periodo);
    expect([n.envios, n.envios_anterior, n.media, n.media_anterior, n.nps, n.nps_anterior]).toEqual([48, 36, 8.4, 8.1, 52, 44]);
    expect(n.melhor_pergunta).toEqual({ texto: "Comida", media: 9 });
    expect(n.pior_pergunta).toEqual({ texto: "Espera", media: 7.1 });
  });

  it("dia e turno: só entram os com 3 envios ou mais; quarta (2 envios) não vira destaque", () => {
    const n = montarNumeros(PAINEL, "X");
    expect(n.melhor_dia).toEqual({ dia: 6, media: 9.1 });
    expect(n.dia_mais_fraco).toEqual({ dia: 1, media: 7.2 });
    expect(n.melhor_turno).toEqual({ turno: "noite", media: 9.1 });
    expect(n.pior_turno).toEqual({ turno: "tarde", media: 7 });
  });

  it("nenhum nome de funcionário vai nos números", () => {
    expect(JSON.stringify(montarNumeros(PAINEL, "X"))).not.toContain("equipe");
  });

  it("sem dados suficientes de dia/turno, não há melhor nem pior", () => {
    const vazio = {
      ...PAINEL,
      dia_semana: PAINEL.dia_semana.map((d) => ({ ...d, envios: 1 })),
      turno: PAINEL.turno.map((t) => ({ ...t, envios: 1 })),
      destaques: { ...PAINEL.destaques, dia_mais_fraco: null },
    };
    const n = montarNumeros(vazio, "X");
    expect([n.melhor_dia, n.dia_mais_fraco, n.melhor_turno, n.pior_turno]).toEqual([null, null, null, null]);
  });
});
