import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { esquemaIdPesquisa } from "@/lib/pesquisas/esquemas";
import { CabecalhoPesquisa } from "./cabecalho-pesquisa";

export const metadata: Metadata = { title: "Editar pesquisa" };

export default async function PaginaEditorPesquisa(props: PageProps<"/painel/pesquisas/[id]">) {
  const { id: idRecebido } = await props.params;
  const { supabase, atual } = await obterContextoEmpresa();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");

  // Endereço inválido ou pesquisa de outra empresa: 404
  const id = esquemaIdPesquisa.safeParse(idRecebido);
  if (!id.success || !atual) notFound();

  const { data: pesquisa } = await supabase
    .from("pesquisas")
    .select("id, titulo, ativa")
    .eq("id", id.data)
    .eq("empresa_id", atual.id)
    .maybeSingle();
  if (!pesquisa) notFound();

  const { data: perguntas } = await supabase
    .from("perguntas")
    .select("id, texto, tipo, obrigatoria, arquivada")
    .eq("pesquisa_id", pesquisa.id)
    .order("ordem");

  const valendo = (perguntas ?? []).filter((p) => !p.arquivada);

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/painel/pesquisas"
        className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 font-semibold text-ameixa underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Pesquisas
      </Link>

      <CabecalhoPesquisa id={pesquisa.id} titulo={pesquisa.titulo} ativa={pesquisa.ativa} />

      <section className="entrada rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8">
        <h2 className="text-xl font-bold">Perguntas</h2>
        {/* Lista simples nesta tarefa; a Task 5 troca por LinhaPergunta */}
        <ol className="mt-4 list-decimal space-y-2 pl-5">
          {valendo.map((p) => (
            <li key={p.id}>{p.texto}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
