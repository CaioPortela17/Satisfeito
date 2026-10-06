import type { TipoPergunta } from "./esquemas";

// Como cada tipo aparece para o dono
export const ROTULO_TIPO: Record<TipoPergunta, string> = {
  nota: "Nota de 1 a 10",
  texto: "Texto livre",
  funcionario: "Quem te atendeu",
};

export const DESCRICAO_TIPO: Record<TipoPergunta, string> = {
  nota: "O cliente escolhe um número. Vira média e gráfico no painel.",
  texto: "O cliente escreve o que quiser. Entra no resumo da IA.",
  funcionario: "O cliente escolhe quem atendeu. Vira o ranking da equipe.",
};
