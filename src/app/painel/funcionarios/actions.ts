"use server";

import { revalidatePath } from "next/cache";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import {
  esquemaIdFuncionario,
  esquemaNomeFuncionario,
  mensagemErroFuncionario,
} from "@/lib/funcionarios/esquemas";
import { createClient } from "@/lib/supabase/server";

export type EstadoAcao = {
  erro?: string;
  ok?: number; // muda a cada sucesso (para o formulário saber que deu certo)
  valor?: string; // o que foi digitado, para não sumir depois de um erro
};

const CAMINHO = "/painel/funcionarios";

function texto(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor : "";
}

export async function adicionarFuncionario(
  _estado: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const digitado = texto(formData, "nome");
  const nome = esquemaNomeFuncionario.safeParse(digitado);
  if (!nome.success) return { erro: nome.error.issues[0].message, valor: digitado };

  // A empresa é a atual do usuário, decidida no servidor; nunca vem do formulário.
  // Mesmo que alguém forje o cookie, o RLS recusa empresa que não é dele.
  const { supabase, atual } = await obterContextoEmpresa();
  if (!atual) return { erro: mensagemErroFuncionario(), valor: digitado };

  const { error } = await supabase
    .from("funcionarios")
    .insert({ empresa_id: atual.id, nome: nome.data });
  if (error) return { erro: mensagemErroFuncionario(error.code), valor: digitado };

  revalidatePath(CAMINHO);
  return { ok: Date.now() };
}

export async function renomearFuncionario(
  _estado: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const digitado = texto(formData, "nome");
  const id = esquemaIdFuncionario.safeParse(texto(formData, "id"));
  const nome = esquemaNomeFuncionario.safeParse(digitado);
  if (!id.success) return { erro: mensagemErroFuncionario(), valor: digitado };
  if (!nome.success) return { erro: nome.error.issues[0].message, valor: digitado };

  const supabase = await createClient();
  const { error } = await supabase
    .from("funcionarios")
    .update({ nome: nome.data })
    .eq("id", id.data);
  if (error) return { erro: mensagemErroFuncionario(error.code), valor: digitado };

  revalidatePath(CAMINHO);
  return { ok: Date.now() };
}

export async function alterarAtivo(idRecebido: string, ativo: boolean): Promise<EstadoAcao> {
  const id = esquemaIdFuncionario.safeParse(idRecebido);
  if (!id.success || typeof ativo !== "boolean") return { erro: mensagemErroFuncionario() };

  const supabase = await createClient();
  const { error } = await supabase.from("funcionarios").update({ ativo }).eq("id", id.data);
  if (error) return { erro: mensagemErroFuncionario(error.code) };

  revalidatePath(CAMINHO);
  return { ok: Date.now() };
}

export async function excluirFuncionario(idRecebido: string): Promise<EstadoAcao> {
  const id = esquemaIdFuncionario.safeParse(idRecebido);
  if (!id.success) return { erro: mensagemErroFuncionario() };

  const supabase = await createClient();
  const { error } = await supabase.from("funcionarios").delete().eq("id", id.data);
  if (error) return { erro: mensagemErroFuncionario(error.code) };

  revalidatePath(CAMINHO);
  return { ok: Date.now() };
}
