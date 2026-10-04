"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/painel", rotulo: "Início" },
  { href: "/painel/funcionarios", rotulo: "Funcionários" },
];

export function NavPainel() {
  const caminho = usePathname();

  return (
    <nav aria-label="Painel" className="flex gap-1">
      {LINKS.map((link) => {
        // "Início" só fica ativo na própria página; os outros também nas subpáginas
        const ativo =
          link.href === "/painel" ? caminho === "/painel" : caminho.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
              // Ativo: pílula ameixa (bem visível). Inativo: texto escuro com fundo ao passar o mouse
              ativo ? "bg-ameixa text-creme" : "bg-card/70 text-ameixa hover:bg-card",
            )}
          >
            {link.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
