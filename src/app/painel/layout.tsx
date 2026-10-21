import type { Viewport } from "next";
import Link from "next/link";
import { Logo } from "@/components/marca/logo";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { NavPainel } from "./nav-painel";
import { SeletorEmpresa } from "./seletor-empresa";

// No painel o topo é a faixa branca; a barra do celular acompanha
export const viewport: Viewport = { themeColor: "#ffffff" };

export default async function LayoutPainel({ children }: LayoutProps<"/painel">) {
  const { empresas, atual } = await obterContextoEmpresa();

  return (
    <div className="flex flex-1 flex-col">
      {/* Faixa branca de ponta a ponta, presa no topo ao rolar a página */}
      <header className="sticky top-0 z-10 print:hidden border-b border-ameixa/10 bg-card shadow-[0_2px_12px_rgba(42,31,45,0.08)]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
          <Link href="/painel" className="inline-flex min-h-11 items-center rounded-md" aria-label="Painel">
            <Logo className="text-2xl" />
          </Link>

          {/* De 1024px para cima: logo, empresa e menu na mesma linha (menu à direita). No celular, empresa e menu descem para uma linha própria */}
          <div className="order-last flex w-full flex-wrap items-center gap-3 lg:order-none lg:w-auto lg:flex-1 lg:flex-nowrap">
            {atual && <SeletorEmpresa empresas={empresas} atualId={atual.id} />}
            <NavPainel temVariasEmpresas={empresas.length > 1} className="lg:ml-auto" />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
