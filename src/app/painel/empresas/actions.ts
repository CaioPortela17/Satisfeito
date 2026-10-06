"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { esquemaNomeEmpresa } from "@/lib/auth/esquemas";
import { mensagemDeErro } from "@/lib/auth/mensagens-erro";
import { COOKIE_EMPRESA } from "@/lib/empresas/contexto";
import { createClient } from "@/lib/supabase/server";

async function guardarEmpresaAtual(id: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_EMPRESA, id, {
    httpOnly: true, // o JavaScript da página não lê nem altera
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // lembra por 1 ano
  });
}

export async function trocarEmpresa(idRecebido: string): Promise<{ erro?: string }> {
  const id = z.uuid().safeParse(idRecebido);
  if (!id.success) return { erro: mensagemDeErro() };

  // Só aceita se a empresa for do usuário (o RLS esconde as dos outros)
  const supabase = await createClient();
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id")
    .eq("id", id.data)
    .maybeSingle();
  if (!empresa) return { erro: mensagemDeErro() };

  await guardarEmpresaAtual(empresa.id);
  // Recarrega todo o painel com os dados da empresa escolhida
  revalidatePath("/painel", "layout");
  return {};
}

export type EstadoNovaEmpresa = { erro?: string; valor?: string };

export async function criarEmpresa(
  _estado: EstadoNovaEmpresa,
  formData: FormData,
): Promise<EstadoNovaEmpresa> {
  const valor = formData.get("nome");
  const digitado = typeof valor === "string" ? valor : "";
  const nome = esquemaNomeEmpresa.safeParse(digitado);
  if (!nome.success) return { erro: nome.error.issues[0].message, valor: digitado };

  const supabase = await createClient();
  // O dono vem do banco (default auth.uid()); só mandamos o nome
  const { data: empresa, error } = await supabase
    .from("empresas")
    .insert({ nome: nome.data })
    .select("id")
    .single();
  if (error || !empresa) return { erro: mensagemDeErro(error?.code), valor: digitado };

  // Já abre o painel na empresa nova
  await guardarEmpresaAtual(empresa.id);
  revalidatePath("/painel", "layout");
  redirect("/painel");
}
