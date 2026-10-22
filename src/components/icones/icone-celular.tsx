import { cn } from "@/lib/utils";

// Celular com os cantos de "escanear" (QR code), nas cores da marca. Decorativo: o texto ao lado explica.
export function IconeCelular({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={cn("size-12", className)}>
      {/* Cantos de escaneamento (coral) */}
      <path d="M5 15V8a3 3 0 0 1 3-3h7M33 5h7a3 3 0 0 1 3 3v7M43 33v7a3 3 0 0 1-3 3h-7M15 43H8a3 3 0 0 1-3-3v-7" stroke="var(--coral)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Celular (ameixa, tela menta) */}
      <rect x="15" y="11" width="18" height="26" rx="4" fill="var(--menta-claro)" stroke="var(--ameixa)" strokeWidth="2.4" />
      <path d="M21.5 15h5" stroke="var(--ameixa)" strokeWidth="2.4" strokeLinecap="round" />
      {/* Mini QR na tela */}
      <rect x="19" y="20" width="4" height="4" rx=".8" fill="var(--ameixa)" />
      <rect x="25" y="20" width="4" height="4" rx=".8" fill="var(--ameixa)" />
      <rect x="19" y="26" width="4" height="4" rx=".8" fill="var(--ameixa)" />
      <rect x="26" y="27" width="2.5" height="2.5" rx=".6" fill="var(--manga)" stroke="var(--ameixa)" strokeWidth="1" />
    </svg>
  );
}
