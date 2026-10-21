"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  esquemaCadastro,
  esquemaEntrar,
  esquemaEsqueciSenha,
  esquemaRedefinirSenha,
} from "@/lib/auth/esquemas";
import { mensagemDeErro } from "@/lib/auth/mensagens-erro";
import { caminhoSeguro } from "@/lib/auth/redirect-seguro";
import { urlDoSite } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

// O que a action devolve para o formulário mostrar na tela
export type EstadoFormulario = {
  erro?: string;
  sucesso?: string;
  erros?: Record<string, string[] | undefined>;
  // Valores digitados (nunca a senha), para o formulário não "apagar" após um erro
  valores?: Record<string, string>;
};

function texto(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor : "";
}

export async function entrar(
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const dados = { email: texto(formData, "email"), senha: texto(formData, "senha") };
  const valores = { email: dados.email };

  const resultado = esquemaEntrar.safeParse(dados);
  if (!resultado.success) {
    return { erros: z.flattenError(resultado.error).fieldErrors, valores };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: resultado.data.email,
    password: resultado.data.senha,
  });
  if (error) return { erro: mensagemDeErro(error.code), valores };

  redirect(caminhoSeguro(texto(formData, "next")));
}

export async function cadastrar(
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const dados = {
    nomeEmpresa: texto(formData, "nomeEmpresa"),
    email: texto(formData, "email"),
    senha: texto(formData, "senha"),
    confirmacao: texto(formData, "confirmacao"),
  };
  const valores = { nomeEmpresa: dados.nomeEmpresa, email: dados.email };

  const resultado = esquemaCadastro.safeParse(dados);
  if (!resultado.success) {
    return { erros: z.flattenError(resultado.error).fieldErrors, valores };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: resultado.data.email,
    password: resultado.data.senha,
    options: {
      // Vai para raw_user_meta_data; o trigger do banco usa para criar a empresa
      data: { nome_empresa: resultado.data.nomeEmpresa },
      // Para onde o link do e-mail de confirmação leva de volta
      emailRedirectTo: urlDoSite("/auth/confirm?next=/painel"),
    },
  });
  if (error) return { erro: mensagemDeErro(error.code), valores };

  // Mesmo que o e-mail já tenha conta, o Supabase responde "ok" sem enviar nada:
  // assim ninguém descobre quais e-mails estão cadastrados.
  redirect("/cadastro/verifique-email");
}

export async function esqueciSenha(
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const dados = { email: texto(formData, "email") };
  const valores = { email: dados.email };

  const resultado = esquemaEsqueciSenha.safeParse(dados);
  if (!resultado.success) {
    return { erros: z.flattenError(resultado.error).fieldErrors, valores };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(resultado.data.email, {
    // O link do e-mail volta para o site e cai na tela de nova senha
    redirectTo: urlDoSite("/auth/confirm?next=/redefinir-senha"),
  });

  // Só mostramos erro de "muitas tentativas". Qualquer outro caso recebe a
  // mesma resposta, para não revelar se o e-mail tem conta ou não.
  if (error?.code?.startsWith("over_")) {
    return { erro: mensagemDeErro(error.code), valores };
  }
  return {
    sucesso: "Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha.",
  };
}

export async function redefinirSenha(
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const resultado = esquemaRedefinirSenha.safeParse({
    senha: texto(formData, "senha"),
    confirmacao: texto(formData, "confirmacao"),
  });
  if (!resultado.success) {
    return { erros: z.flattenError(resultado.error).fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: resultado.data.senha });
  if (error) return { erro: mensagemDeErro(error.code) };

  redirect("/painel");
}
