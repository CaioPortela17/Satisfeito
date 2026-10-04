import Link from "next/link";
import { Logo } from "@/components/marca/logo";
import { Button } from "@/components/ui/button";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { sair } from "./actions";
import { NavPainel } from "./nav-painel";
import { SeletorEmpresa } from "./seletor-empresa";

export default async function LayoutPainel({ children }: LayoutProps<"/painel">) {
  const { empresas, atual } = await obterContextoEmpresa();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
          <Link href="/painel" className="rounded-md" aria-label="Painel">
            <Logo className="text-2xl" />
          </Link>

          {/* No celular, empresa e menu descem para uma linha própria */}
          <div className="order-last flex w-full flex-wrap items-center gap-3 sm:order-none sm:w-auto">
            {atual && <SeletorEmpresa empresas={empresas} atualId={atual.id} />}
            <NavPainel />
          </div>

          <form action={sair} className="ml-auto">
            <Button type="submit" variant="ghost">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
