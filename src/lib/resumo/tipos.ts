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
// total = envios com texto nos últimos 30 dias; lidas = envios entre os textos enviados à IA (até 200 itens)
export type TextosParaResumo = { total: number; lidas: number; textos: TextoParaResumo[] };

// O que reservar_resumo_ia devolve: null (pesquisa não é do dono) ou o resultado da reserva
export type ReservaResumo =
  | { ok: true; id: string }
  | { ok: false; motivo: "teto" }
  | { ok: false; motivo: "intervalo"; minutos: number };
