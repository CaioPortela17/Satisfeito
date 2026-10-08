import Link from "next/link";
import type { Aba, Contagens } from "@/lib/respostas/lista";
import { cn } from "@/lib/utils";

const ROTULOS: { aba: Aba; rotulo: string }[] = [
  { aba: "todas", rotulo: "Todas" },
  { aba: "suspeitas", rotulo: "Suspeitas" },
  { aba: "descartadas", rotulo: "Descartadas" },
];

// Três filtros em colunas iguais. Cada um é um link comum (a URL guarda a aba escolhida).
export function Abas({ pesquisaId, atual, contagens }: { pesquisaId: string; atual: Aba; contagens: Contagens }) {
  return (
    <nav
      id="abas-respostas"
      tabIndex={-1} // permite receber o foco por código (ver AvisosDescarte)
      aria-label="Filtrar respostas"
      className="grid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring grid-cols-3 gap-1 rounded-2xl border border-border bg-creme p-1">
      {ROTULOS.map(({ aba, rotulo }) => {
        const ativa = aba === atual;
        return (
          <Link
            key={aba}
            href={`/painel/respostas?pesquisa=${pesquisaId}&aba=${aba}`}
            aria-current={ativa ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center rounded-xl px-1 text-center text-sm font-semibold leading-tight transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] sm:flex-row sm:gap-1.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              ativa ? "bg-ameixa text-creme" : "text-ameixa/80 hover:bg-ameixa/[0.06] hover:text-ameixa",
            )}
          >
            <span>{rotulo}</span>
            <span className="numeros">({contagens[aba]})</span>
          </Link>
        );
      })}
    </nav>
  );
}
