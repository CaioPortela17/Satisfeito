import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IconeCelular } from "@/components/icones/icone-celular";
import { Logo } from "@/components/marca/logo";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { esquemaIdPesquisa } from "@/lib/pesquisas/esquemas";
import { gerarQrSvg } from "@/lib/qr";
import { urlDoSite } from "@/lib/site-url";
import { BotaoImprimir } from "./botao-imprimir";

export const metadata: Metadata = { title: "Cartaz da pesquisa" };

const NOTAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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
      {/* Folha A4 sem margem: o resto da página some na impressão */}
      <style>{"@page { size: A4; margin: 0; }"}</style>
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

      {/* A folha é um "container": todas as medidas de dentro usam cqw (1% da largura da folha),
          então o cartaz fica idêntico na tela e no papel, em qualquer tamanho. */}
      <article
        className="entrada relative mx-auto aspect-[210/297] w-full max-w-md overflow-hidden rounded-3xl bg-creme shadow-[0_8px_24px_rgba(42,31,45,0.12)] [container-type:inline-size] [print-color-adjust:exact] [-webkit-print-color-adjust:exact] print:aspect-auto print:h-[297mm] print:rounded-none print:w-[210mm] print:max-w-none print:animate-none print:shadow-none"
      >
        {/* Formas de fundo: leves, só nos cantos */}
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-[26cqw] -left-[20cqw] size-[46cqw] rounded-full bg-manga" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-[6cqw] bottom-[12cqw] size-[16cqw] rounded-full bg-coral" />
        <div aria-hidden="true" className="pointer-events-none absolute top-[66cqw] -right-[20cqw] size-[44cqw] rounded-full bg-menta-claro" />

        <div className="relative flex h-full flex-col items-center px-[8cqw] pt-[6cqw] pb-[5cqw] text-center text-ameixa">
          {/* Balão de fala com a pergunta */}
          <div className="relative w-full rounded-[7cqw] bg-menta px-[5cqw] pt-[5cqw] pb-[4cqw]">
            <h1 className="text-[10.5cqw] leading-[1.02] font-extrabold tracking-tight text-balance">
              Como você nos avalia<span className="text-creme">?</span>
            </h1>
            <ol aria-label="Notas de 1 a 10" className="mt-[3.5cqw] flex justify-between">
              {NOTAS.map((n) => (
                <li
                  key={n}
                  className="numeros flex size-[6.6cqw] items-center justify-center rounded-full bg-white text-[3.2cqw] font-bold"
                >
                  {n}
                </li>
              ))}
            </ol>
            {/* Rabinho do balão apontando para o QR code */}
            <div
              aria-hidden="true"
              className="absolute -bottom-[3cqw] left-[16cqw] size-[7cqw] rotate-45 rounded-[1cqw] bg-menta"
            />
          </div>

          {/* QR code (sem o endereço escrito) */}
          <div className="mt-[6cqw] rounded-[6cqw] border-[1.2cqw] border-manga bg-white p-[3cqw]">
            <div
              className="size-[40cqw] [&>svg]:size-full"
              role="img"
              aria-label={`QR code que abre ${link}`}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>

          <div className="mt-[4cqw] flex items-center gap-[3cqw] text-left">
            <IconeCelular className="size-[11cqw] shrink-0" />
            <div>
              <p className="text-[4.4cqw] leading-tight font-bold">Aponte a câmera do celular</p>
              <p className="text-[3.4cqw] leading-tight font-medium text-muted-foreground">Leva menos de 30 segundos</p>
            </div>
          </div>

          <footer className="mt-auto flex w-full flex-col items-center gap-[1cqw] pt-[3cqw]">
            <p className="text-[4.6cqw] leading-tight font-bold text-balance">{atual.nome}</p>
            <Logo className="text-[5.5cqw]" pequeno />
          </footer>
        </div>
      </article>
    </div>
  );
}
