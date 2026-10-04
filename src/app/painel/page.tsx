import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Painel" };

export default async function PaginaPainel() {
  const supabase = await createClient();

  // Segunda camada de proteção: o proxy já barra quem não está logado,
  // mas a página confere de novo, verificando a assinatura do token.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");

  // Não precisamos filtrar por usuário: o RLS do banco só devolve a empresa dele
  const { data: empresa } = await supabase.from("empresas").select("nome").maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground">Bem-vindo ao seu painel</p>
        <h1 className="text-3xl font-bold tracking-tight">
          Olá, {empresa?.nome ?? "tudo bem"}{" "}
          <span aria-hidden="true">👋</span>
        </h1>
      </div>

      <section className="rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)]">
        <h2 className="text-lg font-semibold">Tudo pronto por aqui</h2>
        <p className="mt-1 text-muted-foreground">
          Em breve você vai cadastrar seus funcionários, criar pesquisas e acompanhar as notas
          dos seus clientes neste painel.
        </p>
      </section>
    </div>
  );
}
