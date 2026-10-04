import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconeOla } from "@/components/icones/icone-ola";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";

export const metadata: Metadata = { title: "Painel" };

export default async function PaginaPainel() {
  const { supabase, atual } = await obterContextoEmpresa();

  // Segunda camada de proteção: o proxy já barra quem não está logado,
  // mas a página confere de novo, verificando a assinatura do token.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");

  return (
    <div className="space-y-6">
      <div>
        <p className="font-medium text-ameixa">Bem-vindo ao seu painel</p>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          Olá, {atual?.nome ?? "tudo bem"}
          <IconeOla className="size-10 shrink-0" />
        </h1>
      </div>

      <section className="rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)]">
        <h2 className="text-lg font-semibold">Tudo pronto por aqui</h2>
        <p className="mt-1 text-muted-foreground">
          Em breve você vai cadastrar seus funcionários, criar pesquisas e acompanhar as notas
          dos seus clientes neste painel.
        </p>
        <Link
          href="/painel/funcionarios"
          className="mt-4 inline-block font-semibold text-coral-escuro underline-offset-4 hover:underline"
        >
          Cadastrar funcionários →
        </Link>
      </section>
    </div>
  );
}
