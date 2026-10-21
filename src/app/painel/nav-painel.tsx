"use client";

import { Building2, ChartColumn, ClipboardList, House, LogOut, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { sair } from "./actions";

const LINKS = [
  { href: "/painel", rotulo: "Início", Icone: House },
  { href: "/painel/resultados", rotulo: "Resultados", Icone: ChartColumn },
  { href: "/painel/respostas", rotulo: "Respostas", Icone: MessageSquareText },
  { href: "/painel/pesquisas", rotulo: "Pesquisas", Icone: ClipboardList },
];

// "Unidades" (comparar empresas) só aparece para quem tem mais de uma empresa
const LINK_UNIDADES = { href: "/painel/unidades", rotulo: "Unidades", Icone: Building2 };

export function NavPainel({ temVariasEmpresas = false, className }: { temVariasEmpresas?: boolean; className?: string }) {
  const caminho = usePathname();
  const links = temVariasEmpresas ? [...LINKS.slice(0, 2), LINK_UNIDADES, ...LINKS.slice(2)] : LINKS;

  return (
    // Trilho: um fundo creme único que agrupa os links, como um controle segmentado
    <nav aria-label="Painel" className={cn("flex max-w-full min-w-0 gap-0 min-[360px]:gap-0.5 rounded-full border border-border bg-creme p-1", className)}>
      {links.map(({ href, rotulo, Icone }) => {
        // "Início" só fica ativo na própria página; os outros também nas subpáginas
        const ativo = href === "/painel" ? caminho === "/painel" : caminho.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm font-semibold min-[1180px]:gap-2 min-[1180px]:px-4 transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.97]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              // Ativo: pílula ameixa com sombra leve. Inativo: só texto, ganha fundo ao passar o mouse
              // Ativo pode encolher (min-w-0) e o nome é cortado com "…" em vez de estourar a largura
              ativo
                ? "min-w-11 min-[420px]:min-w-0 shrink bg-ameixa text-creme shadow-[0_1px_3px_rgba(42,31,45,0.25)]"
                : "shrink-0 text-ameixa/75 hover:bg-ameixa/[0.06] hover:text-ameixa active:bg-ameixa/10",
            )}
          >
            <Icone aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.25} />
            {/* Abaixo de 1180px os links inativos mostram só o ícone (o nome segue para o leitor de tela). O ativo também fica só com o ícone abaixo de 420px e mostra o nome de 420px para cima (aria-current vale nos dois casos) */}
            <span className={cn("min-w-0 truncate", ativo ? "max-[420px]:sr-only" : "max-[1179px]:sr-only")}>{rotulo}</span>
          </Link>
        );
      })}

      {/* Sair: último item do trilho, nunca fica "ativo". A linha fina à esquerda separa das páginas */}
      <form action={sair} className="ml-0 flex shrink-0 border-l border-ameixa/15 pl-0.5 min-[360px]:ml-0.5 min-[1180px]:ml-1 min-[1180px]:pl-1">
        <button
          type="submit"
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-ameixa/75 transition-[background-color,color,box-shadow,transform] duration-150 ease-out hover:bg-ameixa/[0.06] hover:text-ameixa focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97] active:bg-ameixa/10 min-[1180px]:gap-2 min-[1180px]:px-4"
        >
          <LogOut aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.25} />
          <span className="max-[1179px]:sr-only">Sair</span>
        </button>
      </form>
    </nav>
  );
}
