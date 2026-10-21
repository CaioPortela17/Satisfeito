import { extremos } from "@/lib/painel/apresentacao";
import type { Painel } from "@/lib/painel/tipos";
import type { NumerosRelatorio } from "./tipos";

// Do painel (calculado pelo banco) para o retrato de números do relatório.
export function montarNumeros(painel: Painel, titulo: string): NumerosRelatorio {
  const dias = extremos(painel.dia_semana);
  const turnos = extremos(painel.turno);
  const d = painel.destaques;

  const dia = (i: number | null) =>
    i === null || painel.dia_semana[i].media === null
      ? null
      : { dia: painel.dia_semana[i].dia, media: painel.dia_semana[i].media as number };
  const turno = (i: number | null) =>
    i === null || painel.turno[i].media === null
      ? null
      : { turno: painel.turno[i].turno, media: painel.turno[i].media as number };

  return {
    pesquisa: titulo,
    periodo: painel.periodo,
    envios: painel.atual.envios,
    envios_anterior: painel.anterior.envios,
    media: painel.atual.media_geral,
    media_anterior: painel.anterior.media_geral,
    nps: painel.atual.nps.valor,
    nps_anterior: painel.anterior.nps.valor,
    melhor_dia: dia(dias.melhor),
    dia_mais_fraco: d.dia_mais_fraco ? { dia: d.dia_mais_fraco.dia, media: d.dia_mais_fraco.media } : dia(dias.pior),
    melhor_turno: turno(turnos.melhor),
    pior_turno: turno(turnos.pior),
    melhor_pergunta: d.melhor_pergunta ? { texto: d.melhor_pergunta.texto, media: d.melhor_pergunta.media } : null,
    pior_pergunta: d.pior_pergunta ? { texto: d.pior_pergunta.texto, media: d.pior_pergunta.media } : null,
    perguntas: painel.perguntas
      .filter((p) => p.media !== null)
      .map((p) => ({ texto: p.texto, media: p.media as number, respostas: p.respostas, media_anterior: p.media_anterior })),
    distribuicao: painel.atual.distribuicao,
  };
}
