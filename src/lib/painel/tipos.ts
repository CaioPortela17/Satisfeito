// O que a função painel_pesquisa (banco) devolve. Veja supabase/migrations/20261014000000_painel_pesquisa.sql
import type { PontoEvolucao } from "@/lib/resultados/tipos";

export type Periodo = 7 | 30 | 90;

export type Nps = {
  valor: number | null; // null = menos de 10 envios com nota ("poucos dados")
  promotores: number;
  neutros: number;
  detratores: number;
  n: number; // envios com nota
};

export type FaixaDistribuicao = { faixa: "1-3" | "4-6" | "7-8" | "9-10"; envios: number };

export type PerguntaPainel = {
  id: string;
  texto: string;
  ordem: number;
  media: number | null; // null = ninguém respondeu no período
  respostas: number;
  media_anterior: number | null;
  respostas_anterior: number; // quantas respostas a pergunta teve no período anterior
};

export type MembroPainel = {
  id: string;
  nome: string;
  ativo: boolean;
  media: number;
  avaliacoes: number;
  media_anterior: number | null;
  avaliacoes_anterior: number; // quantas avaliações a pessoa teve no período anterior
};

export type DiaSemana = { dia: number; media: number | null; envios: number }; // dia: 1 = segunda ... 7 = domingo

export type NomeTurno = "manha" | "tarde" | "noite" | "madrugada";
export type Turno = { turno: NomeTurno; media: number | null; envios: number };

export type Destaques = {
  melhor_pergunta: { id: string; texto: string; media: number } | null;
  pior_pergunta: { id: string; texto: string; media: number } | null;
  dia_mais_fraco: { dia: number; media: number; envios: number } | null;
  melhor_funcionario: { id: string; nome: string; media: number; avaliacoes: number } | null;
};

export type Painel = {
  periodo: { dias: Periodo; inicio: string; fim: string }; // datas AAAA-MM-DD
  atual: {
    envios: number;
    media_geral: number | null;
    nps: Nps;
    distribuicao: FaixaDistribuicao[];
  };
  anterior: {
    envios: number;
    media_geral: number | null;
    nps: { valor: number | null; n: number };
  };
  perguntas: PerguntaPainel[];
  evolucao: PontoEvolucao[];
  dia_semana: DiaSemana[];
  turno: Turno[];
  equipe: MembroPainel[];
  destaques: Destaques;
  suspeitas: number;
};
