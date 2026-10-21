import type { PerguntaPublica } from "@/lib/respostas/formulario";

// O que a função pesquisa_publica devolve
export type PesquisaPublica =
  | { ativa: false; titulo: string; empresa: string }
  | {
      ativa: true;
      id: string;
      titulo: string;
      empresa: string;
      perguntas: PerguntaPublica[];
    };

export type EstadoEnvio = {
  enviado?: boolean;
  erro?: string;
  erros?: Record<string, string>;
};
