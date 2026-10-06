import type { TipoPergunta } from "@/lib/pesquisas/esquemas";
import { cn } from "@/lib/utils";

// Ícones próprios dos tipos de pergunta, nas cores da marca
export function IconeTipoPergunta({ tipo, className }: { tipo: TipoPergunta; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cn("size-6", className)}>
      {tipo === "nota" && (
        <>
          {/* Selo com "10" (manga) */}
          <rect x="2.5" y="4.5" width="19" height="15" rx="4" fill="var(--manga)" stroke="var(--ameixa)" strokeWidth="1.6" />
          <path d="M8 9.5v5M11.5 12a2 2.5 0 1 0 4 0 2 2.5 0 1 0-4 0" stroke="var(--ameixa)" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {tipo === "texto" && (
        <>
          {/* Balão com linhas (menta) */}
          <path d="M5.5 4h13a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H11l-4.5 3.5V17h-1a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" fill="var(--menta-claro)" stroke="var(--ameixa)" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M7.5 9h9M7.5 12.5h6" stroke="var(--ameixa)" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {tipo === "funcionario" && (
        <>
          {/* Pessoa com crachá (coral) */}
          <circle cx="12" cy="8" r="3.5" fill="var(--creme)" stroke="var(--ameixa)" strokeWidth="1.6" />
          <path d="M5 20.5v-1a7 7 0 0 1 14 0v1Z" fill="var(--coral)" stroke="var(--ameixa)" strokeWidth="1.6" strokeLinejoin="round" />
          <rect x="13.5" y="15.5" width="3.5" height="2.5" rx=".8" fill="var(--creme)" />
        </>
      )}
    </svg>
  );
}
