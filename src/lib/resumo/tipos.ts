// tipos.ts: o que as funções do banco devolvem e o relatório em si
import type { NomeTurno, Periodo } from "@/lib/painel/tipos";

// O que a IA escreve. panorama e acoes só existem nos relatórios novos (Etapa 7B);
// os resumos antigos têm só as três listas.
export type Resumo = {
  positivos: string[];
  reclamacoes: string[];
  sugestoes: string[];
  panorama?: string;
  notas?: string; // comentário da IA sobre as notas de 1 a 10 (só nos relatórios feitos depois de 2026-10-20)
  acoes?: string[];
};
export type ResumoRelatorio = Required<Resumo>;

// O retrato dos números usados no relatório (guardado junto, para o texto copiado depois ser igual
// ao que foi gerado). Datas AAAA-MM-DD; dia 1 = segunda ... 7 = domingo.
export type NumerosRelatorio = {
  pesquisa: string;
  periodo: { dias: Periodo; inicio: string; fim: string };
  envios: number;
  envios_anterior: number;
  media: number | null;
  media_anterior: number | null;
  nps: number | null;
  nps_anterior: number | null;
  melhor_dia: { dia: number; media: number } | null;
  dia_mais_fraco: { dia: number; media: number } | null;
  melhor_turno: { turno: NomeTurno; media: number } | null;
  pior_turno: { turno: NomeTurno; media: number } | null;
  melhor_pergunta: { texto: string; media: number } | null;
  pior_pergunta: { texto: string; media: number } | null;
  // Média de cada pergunta de nota no período (retratos antigos não têm) e quantos envios caíram em cada faixa de nota
  perguntas?: { texto: string; media: number; respostas: number; media_anterior: number | null }[];
  distribuicao?: { faixa: "1-3" | "4-6" | "7-8" | "9-10"; envios: number }[];
  // Só vem preenchida quando o dono liga "Citar nomes e notas"; senão é null e nenhum nome sai do servidor
  equipe: { nome: string; media: number; avaliacoes: number }[] | null;
};

export type ResumoSalvo = {
  id: string;
  conteudo: Resumo;
  respostas_lidas: number;
  modelo: string;
  created_at: string; // instante ISO; a hora na tela é formatada no fuso de São Paulo
  dias: Periodo;
  com_nomes: boolean;
  numeros: NumerosRelatorio | null; // null nos resumos antigos
};

export type UsoResumos = { ultimo: ResumoSalvo | null; hoje: number; textos: number };

export type TextoParaResumo = { pergunta: string; texto: string };
// total = envios com texto no período; lidas = envios entre os textos enviados à IA (até 200 itens)
export type TextosParaResumo = { total: number; lidas: number; textos: TextoParaResumo[] };

// O que reservar_resumo_ia devolve: null (pesquisa não é do dono) ou o resultado da reserva
export type ReservaResumo =
  | { ok: true; id: string }
  | { ok: false; motivo: "teto" }
  | { ok: false; motivo: "intervalo"; minutos: number };
