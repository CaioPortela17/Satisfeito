// O que a função resultados_pesquisa (banco) devolve
export type PerguntaNota = {
  id: string;
  texto: string;
  ordem: number;
  media: number | null; // null = ninguém respondeu ainda
  respostas: number;
};

export type PontoEvolucao = { dia: string; media: number; respostas: number }; // dia = AAAA-MM-DD

export type MembroEquipe = {
  id: string;
  nome: string;
  ativo: boolean;
  media: number;
  avaliacoes: number;
};

export type Resultados = {
  totais: { hoje: number; sete_dias: number; trinta_dias: number; geral: number };
  perguntas: PerguntaNota[];
  evolucao: PontoEvolucao[];
  equipe: MembroEquipe[];
};
