// tipos.ts: o que as funções do banco devolvem e o resumo em si
export type Resumo = { positivos: string[]; reclamacoes: string[]; sugestoes: string[] };

export type ResumoSalvo = {
  id: string;
  conteudo: Resumo;
  respostas_lidas: number;
  modelo: string;
  created_at: string; // instante ISO; a hora na tela é formatada no fuso de São Paulo
};

export type UsoResumos = { ultimo: ResumoSalvo | null; hoje: number; textos: number };

export type TextoParaResumo = { pergunta: string; texto: string };
export type TextosParaResumo = { total: number; textos: TextoParaResumo[] };
