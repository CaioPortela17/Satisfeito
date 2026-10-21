// Números de exemplo, usados só nos testes do relatório
import type { NumerosRelatorio } from "./tipos";

export const NUMEROS_EXEMPLO: NumerosRelatorio = {
  pesquisa: "Pesquisa de satisfação",
  periodo: { dias: 30, inicio: "2026-09-17", fim: "2026-10-16" },
  envios: 48,
  envios_anterior: 36,
  media: 8.4,
  media_anterior: 8.1,
  nps: 52,
  nps_anterior: 44,
  melhor_dia: { dia: 6, media: 9.1 },
  dia_mais_fraco: { dia: 1, media: 7.2 },
  melhor_turno: { turno: "noite", media: 9.1 },
  pior_turno: { turno: "tarde", media: 7.0 },
  melhor_pergunta: { texto: "Qualidade da comida", media: 9.0 },
  pior_pergunta: { texto: "Tempo de espera", media: 7.1 },
  perguntas: [
    { texto: "Qualidade da comida", media: 9.0, respostas: 48, media_anterior: 8.8 },
    { texto: "Tempo de espera", media: 7.1, respostas: 47, media_anterior: 7.4 },
  ],
  distribuicao: [
    { faixa: "1-3", envios: 2 },
    { faixa: "4-6", envios: 5 },
    { faixa: "7-8", envios: 14 },
    { faixa: "9-10", envios: 27 },
  ],
};

export const RESUMO_EXEMPLO = {
  panorama: "O mês foi bom: a nota média subiu e mais clientes responderam.",
  notas: "A nota média foi 8,4 e a comida foi a mais bem avaliada, com 9. A espera ficou em 7,1. Foram 27 envios com nota 9 a 10 e 2 com nota 1 a 3.",
  positivos: ["Atendimento simpático", "Lanche saboroso"],
  reclamacoes: ["Demora nos fins de semana"],
  sugestoes: ["Mais opções sem glúten"],
  acoes: ["Reforçar a equipe nas tardes de segunda", "Avisar o tempo de espera ao cliente"],
};
