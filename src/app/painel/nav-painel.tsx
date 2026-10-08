"use client";

import { ChartColumn, ClipboardList, House, MessageSquareText, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/painel", rotulo: "Início", Icone: House },
  { href: "/painel/resultados", rotulo: "Resultados", Icone: ChartColumn },
  { href: "/painel/respostas", rotulo: "Respostas", Icone: MessageSquareText },
  { href: "/painel/funcionarios", rotulo: "Funcionários", Icone: Users },
  { href: "/painel/pesquisas", rotulo: "Pesquisas", Icone: ClipboardList },
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
              "flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-sm sm:px-4 font-semibold transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.97]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              // Ativo: pílula ameixa com sombra leve. Inativo: só texto, ganha fundo ao passar o mouse
              ativo
                ? "bg-ameixa text-creme shadow-[0_1px_3px_rgba(42,31,45,0.25)]"
                : "text-ameixa/75 hover:bg-ameixa/[0.06] hover:text-ameixa active:bg-ameixa/10",
            )}
          >
            <Icone aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.25} />
            {/* No celular só o link ativo mostra o nome; os outros viram ícone (o nome segue para o leitor de tela) */}
            <span className={cn(!ativo && "max-sm:sr-only")}>{rotulo}</span>
          </Link>
        );
      })}
    </nav>
  );
}
