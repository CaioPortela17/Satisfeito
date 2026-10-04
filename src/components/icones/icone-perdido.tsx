import { cn } from "@/lib/utils";

// Ícone próprio da página 404: lupa procurando, com "?" coral dentro
export function IconePerdido({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={cn("size-12", className)}>
      {/* Lente */}
      <circle cx="21" cy="21" r="13" fill="var(--menta-claro)" stroke="var(--ameixa)" strokeWidth="2.5" />
      {/* Cabo */}
      <path d="m31 31 9.5 9.5" stroke="var(--ameixa)" strokeWidth="4" strokeLinecap="round" />
      {/* "?" coral */}
      <path
        d="M16.8 17.3a4.4 4.4 0 1 1 6 4.1c-1.1.5-1.7 1.2-1.7 2.3v.4"
        stroke="var(--coral-texto)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="21.1" cy="28.4" r="1.8" fill="var(--coral-texto)" />
    </svg>
  );
}
