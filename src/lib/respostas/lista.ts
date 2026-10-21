import { z } from "zod";

// O que a função respostas_pesquisa (banco) devolve
export const ABAS = ["todas", "suspeitas", "descartadas"] as const;
export type Aba = (typeof ABAS)[number];

export type ItemEnvio = {
  pergunta: string;
  tipo: "nota" | "texto" | "funcionario"; // "funcionario" só existe em respostas antigas e não aparece na tela
  ordem: number;
  nota: number | null;
  texto: string | null;
};

export type Envio = {
  id: string;
  criada_em: string; // instante (ISO); a hora na tela é formatada no fuso de São Paulo
  descartada: boolean;
  suspeita: boolean;
  media: number | null; // null = envio sem nenhuma nota
  itens: ItemEnvio[];
};

export type Contagens = { todas: number; suspeitas: number; descartadas: number };

export type ListaRespostas = {
  contagens: Contagens;
  pagina: number;
  total_paginas: number;
  envios: Envio[];
};

// Os parâmetros da URL chegam do navegador (podem ser qualquer coisa): validamos antes de usar.
export function lerAba(valor: string | string[] | undefined): Aba {
  return typeof valor === "string" && (ABAS as readonly string[]).includes(valor) ? (valor as Aba) : "todas";
}

export function lerPagina(valor: string | string[] | undefined): number {
  if (typeof valor !== "string" || !/^[1-9]\d{0,5}$/.test(valor)) return 1;
  return Number(valor);
}

// "08/10/2026 às 14:03", sempre no fuso de São Paulo (hourCycle h23 evita "24:00")
const FORMATADOR = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatarDataHora(iso: string): string {
  const p = Object.fromEntries(FORMATADOR.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} às ${p.hour}:${p.minute}`;
}

// Ids chegam do navegador nas Server Actions: conferimos o formato antes de usar
export const esquemaIdResposta = z.uuid("Resposta inválida.");
export const esquemaIdsResposta = z.array(z.uuid("Resposta inválida.")).min(1).max(20);

export function mensagemErroDescarte(): string {
  return "Não deu para atualizar agora. Tente de novo em instantes.";
}
