import { cn } from "@/lib/utils";

// Ícone próprio: duas pessoas (equipe) nas cores da marca — usado na lista vazia de funcionários
export function IconeEquipe({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={cn("size-12", className)}>
      {/* Pessoa de trás (manga) */}
      <circle cx="31" cy="15" r="6" fill="var(--manga)" stroke="var(--ameixa)" strokeWidth="2.5" />
      <path
        d="M21 38v-3a10 10 0 0 1 20 0v3"
        fill="var(--manga)"
        stroke="var(--ameixa)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Pessoa da frente (menta) */}
      <circle cx="18" cy="19" r="6.5" fill="var(--menta)" stroke="var(--ameixa)" strokeWidth="2.5" />
      <path
        d="M7 42v-3.5a11 11 0 0 1 22 0V42Z"
        fill="var(--menta)"
        stroke="var(--ameixa)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
