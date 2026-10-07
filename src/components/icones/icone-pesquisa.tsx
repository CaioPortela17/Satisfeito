import { cn } from "@/lib/utils";

// Ícone próprio: prancheta com uma nota marcada, nas cores da marca
export function IconePesquisa({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={cn("size-12", className)}>
      {/* Prancheta */}
      <rect x="9" y="8" width="30" height="34" rx="5" fill="var(--creme)" stroke="var(--ameixa)" strokeWidth="2.5" />
      {/* Prendedor (manga) */}
      <rect x="17" y="5" width="14" height="7" rx="2.5" fill="var(--manga)" stroke="var(--ameixa)" strokeWidth="2.5" />
      {/* Linhas de pergunta */}
      <path d="M16 21h16M16 29h10" stroke="var(--ameixa)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Marca de "respondido" (coral) */}
      <circle cx="33" cy="34" r="6" fill="var(--coral)" stroke="var(--ameixa)" strokeWidth="2.5" />
      <path d="m30.5 34 1.8 1.8 3.2-3.6" stroke="var(--creme)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
