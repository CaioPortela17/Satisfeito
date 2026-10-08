import { Download, Printer } from "lucide-react";
import Link from "next/link";
import { gerarQrSvg } from "@/lib/qr";
import { urlDoSite } from "@/lib/site-url";
import { BotaoCopiarLink } from "./botao-copiar-link";
import { FormularioSlug } from "./formulario-slug";

const BOTAO_SECUNDARIO =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ameixa/25 px-4 text-sm font-semibold text-ameixa select-none transition-[background-color,transform] duration-150 ease-out hover:bg-muted active:scale-[0.97] motion-reduce:transition-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

// Cartão do editor: link público, QR code para baixar e atalho para o cartaz
export async function CartaoLinkQr({ pesquisaId, slug }: { pesquisaId: string; slug: string }) {
  const link = urlDoSite(`/p/${slug}`);
  const svg = await gerarQrSvg(link);
  const download = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  return (
    <section className="entrada rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8">
      <h2 className="text-xl font-bold">Link e QR code</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Coloque na mesa, no balcão ou na nota fiscal. O cliente responde sem criar conta.
      </p>
      <div className="mt-4 flex flex-col gap-6 sm:flex-row">
        {/* SVG gerado no servidor a partir do nosso próprio link: seguro para inserir */}
        <div
          className="size-40 shrink-0 self-center rounded-2xl border border-border bg-white p-1 sm:self-start [&>svg]:size-full"
          role="img"
          aria-label={`QR code que abre ${link}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="font-mono text-sm break-all">{link}</p>
          <div className="flex flex-wrap gap-2">
            <BotaoCopiarLink link={link} />
            <a href={download} download={`qr-${slug}.svg`} className={BOTAO_SECUNDARIO}>
              <Download className="size-4" aria-hidden="true" />
              Baixar QR code
            </a>
            <Link href={`/painel/pesquisas/${pesquisaId}/cartaz`} className={BOTAO_SECUNDARIO}>
              <Printer className="size-4" aria-hidden="true" />
              Imprimir cartaz
            </Link>
          </div>
          <FormularioSlug id={pesquisaId} slug={slug} base={urlDoSite("/p/")} />
        </div>
      </div>
    </section>
  );
}
