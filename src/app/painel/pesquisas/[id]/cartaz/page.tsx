import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Logo } from "@/components/marca/logo";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { esquemaIdPesquisa } from "@/lib/pesquisas/esquemas";
import { gerarQrSvg } from "@/lib/qr";
import { urlDoSite } from "@/lib/site-url";
import { BotaoImprimir } from "./botao-imprimir";

export const metadata: Metadata = { title: "Cartaz da pesquisa" };

export default async function PaginaCartaz(props: PageProps<"/painel/pesquisas/[id]/cartaz">) {
  const { id: idRecebido } = await props.params;
  const { supabase, atual } = await obterContextoEmpresa();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");

  const id = esquemaIdPesquisa.safeParse(idRecebido);
  if (!id.success || !atual) notFound();
  const { data: pesquisa } = await supabase
    .from("pesquisas")
    .select("id, slug")
    .eq("id", id.data)
    .eq("empresa_id", atual.id)
    .maybeSingle();
  if (!pesquisa) notFound();

  const link = urlDoSite(`/p/${pesquisa.slug}`);
  const svg = await gerarQrSvg(link);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link
          href={`/painel/pesquisas/${pesquisa.id}`}
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 font-semibold text-ameixa underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar para a pesquisa
        </Link>
        <BotaoImprimir />
      </div>
      {/* Folha do cartaz: na impressão, só ela aparece */}
      <article className="entrada mx-auto flex max-w-md flex-col items-center gap-5 rounded-3xl bg-card p-8 text-center shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-10 print:max-w-none print:animate-none print:shadow-none">
        <p className="text-xl font-bold text-ameixa">{atual.nome}</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-balance text-ameixa">
          Conta pra gente como foi<span className="text-coral-texto">?</span>
        </h1>
        <div
          className="size-64 rounded-2xl border-4 border-manga bg-white p-1 [&>svg]:size-full"
          role="img"
          aria-label={`QR code que abre ${link}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="text-lg font-medium text-balance">
          Aponte a câmera do celular. Leva menos de 30 segundos.
        </p>
        <p className="font-mono text-sm break-all text-muted-foreground">{link}</p>
        <Logo className="text-xl" pequeno />
      </article>
    </div>
  );
}
