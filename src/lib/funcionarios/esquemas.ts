import { z } from "zod";

// Mesmas regras do banco: 1 a 60 caracteres, sem espaços nas pontas
export const esquemaNomeFuncionario = z
  .string("Digite o nome do funcionário.")
  .trim()
  .min(1, "Digite o nome do funcionário.")
  .max(60, "O nome pode ter no máximo 60 caracteres.");

// Ids chegam do navegador: conferimos o formato antes de usar
export const esquemaIdFuncionario = z.uuid("Funcionário inválido.");

const MENSAGENS: Record<string, string> = {
  // unique_violation: o índice único (empresa_id, lower(nome)) recusou
  "23505": "Já existe um funcionário com esse nome. Diferencie, por exemplo: Ana Paula ou Ana C.",
};

export function mensagemErroFuncionario(codigo?: string): string {
  return (codigo && MENSAGENS[codigo]) || "Algo deu errado. Tente de novo em instantes.";
}
