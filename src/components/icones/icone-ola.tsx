import { cn } from "@/lib/utils";

// Ícone próprio do satisfeito?!: balão de conversa com "?!" — usado na saudação do painel
// no lugar do emoji 👋.
export function IconeOla({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("size-10", className)}
    >
      {/* Balão */}
      <path
        d="M11 8h26a7 7 0 0 1 7 7v13a7 7 0 0 1-7 7H23l-9 7v-7h-3a7 7 0 0 1-7-7V15a7 7 0 0 1 7-7Z"
        fill="var(--menta-claro)"
        stroke="var(--ameixa)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* "?" coral */}
      <path
        d="M17.5 17.5a4.5 4.5 0 1 1 6.2 4.2c-1.2.5-1.7 1.2-1.7 2.3v.5"
        stroke="var(--coral-texto)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="22" cy="28.6" r="1.8" fill="var(--coral-texto)" />
      {/* "!" manga escuro (legível sobre o menta claro) */}
      <path d="M30.5 14v9.5" stroke="var(--manga-texto)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="30.5" cy="28.6" r="1.8" fill="var(--manga-texto)" />
    </svg>
  );
}
