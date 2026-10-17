import { ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconeOla } from "@/components/icones/icone-ola";
import { emailAtivo } from "@/lib/avisos/email";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { passosDoPainel, tudoPronto } from "@/lib/painel/primeiros-passos";
import { cn } from "@/lib/utils";
import { AvisosEmail } from "./avisos/avisos-email";
import { ExcluirConta } from "./conta/excluir-conta";

export const metadata: Metadata = { title: "Painel" };

export default async function PaginaPainel() {
  const { supabase, atual } = await obterContextoEmpresa();

  // Segunda camada de proteção: o proxy já barra quem não está logado,
  // mas a página confere de novo, verificando a assinatura do token.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");

  // Opções de aviso por e-mail da empresa aberta (o RLS só devolve se for do usuário)
  const { data: avisos } = atual
    ? await supabase.from("empresas").select("aviso_nota_baixa, relatorio_semanal").eq("id", atual.id).maybeSingle()
    : { data: null };

  // O que a empresa aberta já tem, para marcar os passos como feitos (o RLS só devolve o que é do usuário)
  const contar = async (consulta: PromiseLike<{ count: number | null }>) => (await consulta).count ?? 0;
  const [funcionarios, pesquisasIds] = atual
    ? await Promise.all([
        contar(supabase.from("funcionarios").select("id", { count: "exact", head: true }).eq("empresa_id", atual.id).eq("ativo", true)),
        supabase.from("pesquisas").select("id").eq("empresa_id", atual.id),
      ])
    : [0, { data: null }];
  const ids = (pesquisasIds.data ?? []).map((p) => p.id);
  const respostas = ids.length
    ? await contar(supabase.from("respostas").select("id", { count: "exact", head: true }).in("pesquisa_id", ids).eq("descartada", false))
    : 0;
  const passos = passosDoPainel({ funcionarios, pesquisas: ids.length, respostas });
  const pronto = tudoPronto(passos);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Olá, {atual?.nome ?? "tudo bem"}
          <IconeOla className="size-10 shrink-0" />
        </h1>
        <p className="mt-1 text-lg font-medium text-ameixa">
          Bora deixar tudo pronto pros seus clientes avaliarem?
        </p>
      </div>

      <section className="entrada rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8">
        <h2 className="text-xl font-bold">{pronto ? "Tudo pronto por aqui" : "Primeiros passos"}</h2>
        {pronto && <p className="mt-1 text-muted-foreground">Sua pesquisa já está recebendo respostas. Os passos abaixo ficam aqui para consulta.</p>}
        <ol className="mt-5 space-y-5">
          {passos.map((passo, i) => (
            <li key={passo.chave} className="flex gap-4">
              <span
                className={cn(
                  "numeros flex size-9 shrink-0 items-center justify-center rounded-full font-bold",
                  passo.feito ? "bg-menta-claro text-menta-texto" : "bg-ameixa text-creme",
                )}
              >
                {passo.feito ? <Check className="size-5" strokeWidth={3} aria-hidden="true" /> : i + 1}
              </span>
              <div>
                <h3 className="font-semibold">
                  {passo.titulo}
                  {passo.feito && (
                    <span className="ml-2 rounded-full bg-menta-claro px-2 py-0.5 text-xs font-semibold text-menta-texto">Feito</span>
                  )}
                </h3>
                <p className="text-muted-foreground">{passo.texto}</p>
                <Link
                  href={passo.href}
                  className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-semibold text-coral-escuro underline-offset-4 hover:underline"
                >
                  {passo.acao}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {atual && avisos && (
        <AvisosEmail
          key={atual.id}
          empresaId={atual.id}
          notaBaixa={avisos.aviso_nota_baixa}
          relatorioSemanal={avisos.relatorio_semanal}
          emailAtivo={emailAtivo()}
        />
      )}

      <ExcluirConta />
    </div>
  );
}
