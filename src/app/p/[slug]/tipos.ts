import type { PerguntaPublica } from "@/lib/respostas/formulario";

export type FuncionarioPublico = { id: string; nome: string };

// O que a função pesquisa_publica devolve
export type PesquisaPublica =
  | { ativa: false; titulo: string; empresa: string }
  | {
      ativa: true;
      id: string;
      titulo: string;
      empresa: string;
      perguntas: PerguntaPublica[];
      funcionarios: FuncionarioPublico[];
    };

export type EstadoEnvio = {
  enviado?: boolean;
  erro?: string;
  erros?: Record<string, string>;
};
