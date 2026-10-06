"use client";

import { House, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/painel", rotulo: "Início", Icone: House },
  { href: "/painel/funcionarios", rotulo: "Funcionários", Icone: Users },
];

export function NavPainel() {
  const caminho = usePathname();

  return (
    // Trilho: um fundo creme único que agrupa os links, como um controle segmentado
    <nav aria-label="Painel" className="flex gap-1 rounded-full border border-border bg-creme p-1">
      {LINKS.map(({ href, rotulo, Icone }) => {
        // "Início" só fica ativo na própria página; os outros também nas subpáginas
        const ativo = href === "/painel" ? caminho === "/painel" : caminho.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              // Ativo: pílula ameixa com sombra leve. Inativo: só texto, ganha fundo ao passar o mouse
              ativo
                ? "bg-ameixa text-creme shadow-[0_1px_3px_rgba(42,31,45,0.25)]"
                : "text-ameixa/75 hover:bg-ameixa/[0.06] hover:text-ameixa active:bg-ameixa/10",
            )}
          >
            <Icone aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.25} />
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
