import { cn } from "@/lib/utils";

// Ícone próprio: coração dentro do balão da marca, para a tela de obrigado
export function IconeObrigado({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={cn("size-16", className)}>
      <path
        d="M11 8h26a7 7 0 0 1 7 7v13a7 7 0 0 1-7 7H23l-9 7v-7h-3a7 7 0 0 1-7-7V15a7 7 0 0 1 7-7Z"
        fill="var(--menta-claro)"
        stroke="var(--ameixa)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M24 29s-7-4.3-7-9.2A3.8 3.8 0 0 1 24 17.6a3.8 3.8 0 0 1 7 2.2C31 24.7 24 29 24 29Z"
        fill="var(--coral)"
        stroke="var(--ameixa)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
