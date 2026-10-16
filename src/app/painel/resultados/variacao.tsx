import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { textoVariacao, type TipoNumero, type Variacao } from "@/lib/painel/apresentacao";
import { cn } from "@/lib/utils";

// A variação em relação ao período anterior: seta + frase escrita (a seta e a cor sozinhas não bastam).
// "poucos dados" some quando ocultarPoucos (listas longas ficariam poluídas com o mesmo aviso).
export function LinhaVariacao({
  variacao,
  tipo,
  ocultarPoucos = false,
  className,
}: {
  variacao: Variacao;
  tipo: TipoNumero;
  ocultarPoucos?: boolean;
  className?: string;
}) {
  if (variacao.tipo === "poucos-dados" && ocultarPoucos) return null;
  const Icone = variacao.tipo === "sobe" ? ArrowUp : variacao.tipo === "desce" ? ArrowDown : Minus;
  const cor =
    variacao.tipo === "sobe" ? "text-menta-texto" : variacao.tipo === "desce" ? "text-coral-escuro" : "text-muted-foreground";
  return (
    <p className={cn("flex items-start gap-1 text-sm font-medium", cor, className)}>
      <Icone aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{textoVariacao(variacao, tipo)}</span>
    </p>
  );
}
