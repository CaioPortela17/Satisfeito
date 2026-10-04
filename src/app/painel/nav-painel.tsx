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
              "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-muted",
              ativo ? "bg-manga-claro text-ameixa" : "text-muted-foreground",
            )}
          >
            {link.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
