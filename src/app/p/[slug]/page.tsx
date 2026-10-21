import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/marca/logo";
import { TIPOS_PERGUNTA } from "@/lib/pesquisas/esquemas";
import { criarCarimbo } from "@/lib/respostas/carimbo";
import { createClient } from "@/lib/supabase/server";
import { FormularioResposta } from "./formulario-resposta";
import type { PesquisaPublica } from "./tipos";

// Página pública (sem login). Lê cookies via createClient, então é renderizada
// a cada pedido: o carimbo de tempo abaixo sempre nasce na hora em que a página abre.
async function buscar(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("pesquisa_publica", { p_slug: slug });
  return data as unknown as PesquisaPublica | null;
}

export async function generateMetadata(props: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const pesquisa = await buscar(slug);
  return { title: pesquisa ? `Avalie ${pesquisa.empresa}` : "Pesquisa não encontrada" };
}

export default async function PaginaPesquisaPublica(props: PageProps<"/p/[slug]">) {
  const { slug } = await props.params;
  const pesquisa = await buscar(slug);
  if (!pesquisa) notFound();

  return (
    <main className="flex w-full flex-1 flex-col bg-menta">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6 sm:py-10">
        <p className="text-center text-lg font-bold text-ameixa">{pesquisa.empresa}</p>
        {pesquisa.ativa ? (
          <FormularioResposta
            slug={slug}
            pesquisaId={pesquisa.id}
            titulo={pesquisa.titulo}
            empresa={pesquisa.empresa}
            perguntas={pesquisa.perguntas.filter((p) => TIPOS_PERGUNTA.includes(p.tipo))}
            carimbo={novoCarimbo()}
          />
        ) : (
          <section className="mt-6 rounded-3xl bg-card p-8 text-center shadow-[0_8px_24px_rgba(42,31,45,0.12)]">
            <h1 className="text-2xl font-bold">Pesquisa pausada</h1>
            <p className="mt-2 text-muted-foreground">Essa pesquisa está pausada no momento. Volte outra hora!</p>
          </section>
        )}
        <footer className="mt-auto flex flex-col items-center gap-1 pt-8">
          <Logo className="text-base" />
          <p className="text-center text-xs text-ameixa/80">
            Resposta anônima. Não escreva dados pessoais.{" "}
            <Link href="/privacidade" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
              Como usamos os dados
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}

// Fora do componente: a hora é lida uma vez por pedido, no servidor
function novoCarimbo() {
  const segredo = process.env.CARIMBO_SEGREDO;
  if (!segredo) throw new Error("Falta CARIMBO_SEGREDO no .env.local");
  return criarCarimbo(Date.now(), segredo);
}
