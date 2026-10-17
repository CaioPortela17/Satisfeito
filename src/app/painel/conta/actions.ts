"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { apagarDadosDoDono } from "@/lib/conta/excluir";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const esquema = z.object({ email: z.string().max(320) });

// Direito de exclusão (LGPD): apaga a conta do dono e tudo que é dela. Para evitar clique por engano, a pessoa
// precisa digitar o próprio e-mail. Depois de apagar, sai da conta e volta para o início.
export async function excluirConta(emailDigitado: string): Promise<{ erro: string }> {
  const pedido = esquema.safeParse({ email: emailDigitado });
  if (!pedido.success) return { erro: "Digite o seu e-mail para confirmar." };

  const supabase = await createClient();
  const { data: sessao } = await supabase.auth.getClaims();
  const email = typeof sessao?.claims?.email === "string" ? sessao.claims.email : null;
  if (!sessao?.claims || !email) return { erro: "Entre na sua conta de novo para continuar." };
  if (pedido.data.email.trim().toLowerCase() !== email.toLowerCase()) {
    return { erro: "O e-mail digitado não é o da sua conta." };
  }

  const resultado = await apagarDadosDoDono(criarClienteAdmin(), sessao.claims.sub);
  if (!resultado.ok) return { erro: "Não deu para excluir agora. Tente de novo em instantes ou fale com a gente." };

  await supabase.auth.signOut();
  redirect("/");
}
