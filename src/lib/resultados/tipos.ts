// Tipos pequenos usados pelo gráfico e pelo ranking da página Resultados.
// Os números completos do painel (período, comparação, NPS...) estão em src/lib/painel/tipos.ts.

export type PontoEvolucao = { dia: string; media: number; respostas: number }; // dia = AAAA-MM-DD

export type MembroEquipe = {
  id: string;
  nome: string;
  ativo: boolean;
  media: number;
  avaliacoes: number;
};
