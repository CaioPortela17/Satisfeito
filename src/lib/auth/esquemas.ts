import { z } from "zod";

// As mesmas regras valem no servidor. Nunca confiamos só no navegador,
// porque qualquer pessoa pode enviar um formulário "na mão".

const email = z
  .string("Digite um e-mail válido.")
  .trim()
  .toLowerCase()
  .pipe(z.email("Digite um e-mail válido."));

// 72 é o limite do algoritmo de senha (bcrypt) usado pelo Supabase
const senhaNova = z
  .string("A senha precisa ter pelo menos 8 caracteres.")
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.");

// Usado no cadastro e em "Adicionar empresa"
export const esquemaNomeEmpresa = z
  .string("Digite o nome do seu negócio.")
  .trim()
  .min(1, "Digite o nome do seu negócio.")
  .max(100, "O nome pode ter no máximo 100 caracteres.");

export const esquemaCadastro = z.object({
  nomeEmpresa: esquemaNomeEmpresa,
  email,
  senha: senhaNova,
});

export const esquemaEntrar = z.object({
  email,
  senha: z.string("Digite sua senha.").min(1, "Digite sua senha."),
});

export const esquemaEsqueciSenha = z.object({ email });

export const esquemaRedefinirSenha = z
  .object({ senha: senhaNova, confirmacao: z.string() })
  .refine((dados) => dados.senha === dados.confirmacao, {
    message: "As senhas não são iguais.",
    path: ["confirmacao"],
  });
