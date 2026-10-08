import { faixaDaNota, type Faixa } from "@/lib/notas/faixa";
import { formatarMedia, rotuloFaixa } from "@/lib/resultados/apresentacao";
import type { PerguntaNota } from "@/lib/resultados/tipos";
import { cn } from "@/lib/utils";

const COR_FAIXA: Record<Faixa, string> = {
  boa: "bg-menta-claro text-menta-texto",
  atencao: "bg-manga-claro text-manga-texto",
  ruim: "bg-coral/15 text-coral-escuro",
};

// Média de cada pergunta de nota. A faixa vem escrita, não só em cor.
export function CartoesPerguntas({ perguntas }: { perguntas: PerguntaNota[] }) {
  if (perguntas.length === 0) {
    return <p className="text-muted-foreground">Esta pesquisa não tem pergunta de nota.</p>;
  }
  return (
    <ul className="space-y-3">
      {perguntas.map((p) => (
        <li key={p.id} className="flex items-center gap-4 rounded-2xl bg-creme p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold break-words">{p.texto}</p>
            <p className="numeros text-sm text-muted-foreground">
              {p.respostas === 1 ? "1 resposta" : `${p.respostas} respostas`}
            </p>
          </div>
          {p.media === null ? (
            <p className="shrink-0 text-sm font-medium text-muted-foreground">Sem respostas</p>
          ) : (
            <div className="shrink-0 text-right">
              <p className="numeros text-3xl font-bold tracking-tight">{formatarMedia(p.media)}</p>
              <p className={cn("mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", COR_FAIXA[faixaDaNota(p.media)])}>
                {rotuloFaixa(p.media)}
              </p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
