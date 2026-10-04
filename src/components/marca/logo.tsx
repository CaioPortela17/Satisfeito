import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /** Use em tamanhos pequenos: troca o "!" por um amarelo mais escuro e legível */
  pequeno?: boolean;
};

// O leitor de tela lê só "Satisfeito"; as cores são decoração.
export function Logo({ className, pequeno = false }: LogoProps) {
  return (
    <span
      role="img"
      aria-label="Satisfeito"
      className={cn("font-extrabold leading-none tracking-tight text-ameixa", className)}
    >
      <span aria-hidden="true">
        satisfeito
        <span className="text-coral-texto">?</span>
        <span className={pequeno ? "text-manga-texto" : "text-manga"}>!</span>
      </span>
    </span>
  );
}
