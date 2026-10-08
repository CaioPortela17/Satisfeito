import { faixaDaNota, type Faixa } from "@/lib/notas/faixa";
import { formatarMedia, ordenarEquipe, poucasAvaliacoes, rotuloFaixa } from "@/lib/resultados/apresentacao";
import type { MembroEquipe } from "@/lib/resultados/tipos";
import { cn } from "@/lib/utils";

const COR_FAIXA: Record<Faixa, string> = {
  boa: "bg-menta-claro text-menta-texto",
  atencao: "bg-manga-claro text-manga-texto",
  ruim: "bg-coral/15 text-coral-escuro",
};

// Ranking da equipe por nota média. Quem tem poucas avaliações recebe um aviso,
// porque uma média de 1 ou 2 clientes engana.
export function RankingEquipe({ equipe }: { equipe: MembroEquipe[] }) {
  const lista = ordenarEquipe(equipe);
  return (
    <ol className="space-y-3">
      {lista.map((f, i) => {
        const poucas = poucasAvaliacoes(f.avaliacoes);
        return (
          <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-creme p-4">
            <span aria-hidden="true" className="numeros flex size-8 shrink-0 items-center justify-center rounded-full bg-card text-sm font-bold">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold break-words">
                {f.nome}
                {!f.ativo && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">inativo</span>}
              </p>
              <p className="numeros text-sm text-muted-foreground">
                {f.avaliacoes === 1 ? "1 avaliação" : `${f.avaliacoes} avaliações`}
                {poucas && <span className="ml-2 rounded-full bg-manga-claro px-2 py-0.5 text-xs font-semibold text-manga-texto">poucas avaliações</span>}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="numeros text-2xl font-bold tracking-tight">{formatarMedia(f.media)}</p>
              <p className={cn("mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", COR_FAIXA[faixaDaNota(f.media)])}>
                {rotuloFaixa(f.media)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
