import Link from "next/link";
import type { Aba } from "@/lib/respostas/lista";

const BASE =
  "flex min-h-11 min-w-28 items-center justify-center rounded-full border border-border bg-card px-4 text-sm font-semibold";
const FOCO = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

// Anterior / Próxima. Com uma página só, não mostra nada.
export function Paginacao({
  pesquisaId,
  aba,
  pagina,
  totalPaginas,
}: {
  pesquisaId: string;
  aba: Aba;
  pagina: number;
  totalPaginas: number;
}) {
  if (totalPaginas <= 1) return null;

  const href = (n: number) => `/painel/respostas?pesquisa=${pesquisaId}&aba=${aba}&pagina=${n}`;

  return (
    <nav aria-label="Páginas de respostas" className="flex items-center justify-between gap-3">
      {pagina > 1 ? (
        <Link href={href(pagina - 1)} className={`${BASE} ${FOCO} text-ameixa hover:bg-creme`}>
          Anterior
        </Link>
      ) : (
        <span aria-disabled="true" className={`${BASE} text-muted-foreground opacity-60`}>
          Anterior
        </span>
      )}
      <p className="numeros text-center text-sm font-medium">
        Página {pagina} de {totalPaginas}
      </p>
      {pagina < totalPaginas ? (
        <Link href={href(pagina + 1)} className={`${BASE} ${FOCO} text-ameixa hover:bg-creme`}>
          Próxima
        </Link>
      ) : (
        <span aria-disabled="true" className={`${BASE} text-muted-foreground opacity-60`}>
          Próxima
        </span>
      )}
    </nav>
  );
}
