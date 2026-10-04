import { cn } from "@/lib/utils";

// Ícone próprio do satisfeito?!: envelope com um selo coral de "!" (mensagem nova).
// Usamos ícones desenhados por nós em vez de emojis, que mudam de cara em cada aparelho.
export function IconeEmail({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("size-12", className)}
    >
      {/* Envelope */}
      <rect x="5" y="13" width="34" height="25" rx="6" fill="#fff" stroke="var(--ameixa)" strokeWidth="2.5" />
      {/* Aba do envelope */}
      <path
        d="M7.5 16.5 20.3 26a3 3 0 0 0 3.4 0l12.8-9.5"
        stroke="var(--ameixa)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Selo de mensagem nova */}
      <circle cx="38" cy="13" r="8" fill="var(--coral)" stroke="var(--ameixa)" strokeWidth="2.5" />
      <path d="M38 9.2v4.6" stroke="var(--ameixa)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="38" cy="17" r="1.4" fill="var(--ameixa)" />
    </svg>
  );
}
