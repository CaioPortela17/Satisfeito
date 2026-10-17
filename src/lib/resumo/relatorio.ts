import { nomeDia, textoVariacao, variacaoContagem, variacaoMedia, variacaoNps } from "@/lib/painel/apresentacao";
import type { NomeTurno } from "@/lib/painel/tipos";
import { formatarMedia } from "@/lib/resultados/apresentacao";
import type { NumerosRelatorio, Resumo } from "./tipos";

const TURNOS_CURTOS: Record<NomeTurno, string> = { manha: "manhã", tarde: "tarde", noite: "noite", madrugada: "madrugada" };

// O WhatsApp trata * _ ~ e ` como formatação. Tiramos esses sinais do que vem de fora (título da pesquisa,
// texto da IA) para ninguém conseguir "fabricar" uma seção em negrito dentro do relatório.
function limpar(texto: string): string {
  return texto.replace(/[*_~`]/g, "").replace(/\s+/g, " ").trim();
}

// "2026-10-14" -> "14/10"
function diaMes(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

function comVariacao(valor: string, texto: string, poucos: boolean): string {
  return poucos ? valor : `${valor} (${texto.charAt(0).toLowerCase()}${texto.slice(1)})`;
}

function lista(titulo: string, itens: string[] | undefined): string | null {
  const limpos = (itens ?? []).map(limpar).filter((x) => x.length > 0);
  if (limpos.length === 0) return null;
  return [`*${titulo}*`, ...limpos.map((i) => `- ${i}`)].join("\n");
}

// Monta a mensagem de WhatsApp: os NÚMEROS vêm do retrato guardado (calculado pelo banco) e a PROSA vem da IA.
// Seções sem conteúdo são omitidas. Sem emojis.
export function montarRelatorioWhatsApp(n: NumerosRelatorio, r: Resumo): string {
  const blocos: string[] = [];

  blocos.push(
    `*Relatório de satisfação: ${limpar(n.pesquisa)}*\nÚltimos ${n.periodo.dias} dias (${diaMes(n.periodo.inicio)} a ${diaMes(n.periodo.fim)})`,
  );

  const panorama: string[] = ["*Panorama*"];
  if (r.panorama && limpar(r.panorama)) panorama.push(limpar(r.panorama));
  const vResp = variacaoContagem(n.envios, n.envios_anterior);
  panorama.push(`Respostas: ${comVariacao(String(n.envios), textoVariacao(vResp, "contagem"), vResp.tipo === "poucos-dados")}`);
  if (n.media !== null) {
    const v = variacaoMedia(n.media, n.media_anterior, n.envios, n.envios_anterior);
    panorama.push(`Nota média: ${comVariacao(formatarMedia(n.media), textoVariacao(v, "media"), v.tipo === "poucos-dados")}`);
  }
  if (n.nps !== null) {
    const v = variacaoNps(n.nps, n.nps_anterior);
    panorama.push(`NPS: ${comVariacao(String(n.nps), textoVariacao(v, "nps"), v.tipo === "poucos-dados")}`);
  }
  blocos.push(panorama.join("\n"));

  const diasTurnos: string[] = [];
  if (n.melhor_dia && n.dia_mais_fraco) {
    diasTurnos.push(
      `Melhor dia: ${nomeDia(n.melhor_dia.dia)} (${formatarMedia(n.melhor_dia.media)}). Dia mais fraco: ${nomeDia(n.dia_mais_fraco.dia)} (${formatarMedia(n.dia_mais_fraco.media)}).`,
    );
  }
  if (n.melhor_turno && n.pior_turno) {
    diasTurnos.push(
      `Melhor turno: ${TURNOS_CURTOS[n.melhor_turno.turno]} (${formatarMedia(n.melhor_turno.media)}). Turno mais fraco: ${TURNOS_CURTOS[n.pior_turno.turno]} (${formatarMedia(n.pior_turno.media)}).`,
    );
  }
  if (diasTurnos.length > 0) blocos.push(["*Dias e turnos*", ...diasTurnos].join("\n"));

  if (n.melhor_pergunta && n.pior_pergunta) {
    blocos.push(
      [
        "*Notas por pergunta*",
        `Mais bem avaliada: ${limpar(n.melhor_pergunta.texto)} (${formatarMedia(n.melhor_pergunta.media)})`,
        `Mais fraca: ${limpar(n.pior_pergunta.texto)} (${formatarMedia(n.pior_pergunta.media)})`,
      ].join("\n"),
    );
  }

  if (n.equipe && n.equipe.length > 0) {
    blocos.push(
      [
        "*Equipe*",
        ...n.equipe.map(
          (m) => `- ${limpar(m.nome)}: ${formatarMedia(m.media)} (${m.avaliacoes === 1 ? "1 avaliação" : `${m.avaliacoes} avaliações`})`,
        ),
      ].join("\n"),
    );
  }

  for (const bloco of [
    lista("O que os clientes elogiaram", r.positivos),
    lista("O que os clientes reclamaram", r.reclamacoes),
    lista("O que os clientes sugeriram", r.sugestoes),
    lista("Ações sugeridas", r.acoes),
  ]) {
    if (bloco) blocos.push(bloco);
  }

  return blocos.join("\n\n");
}
