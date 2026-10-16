import { MIN_NPS, rotuloNps, variacaoContagem, variacaoMedia, variacaoNps } from "@/lib/painel/apresentacao";
import type { Painel } from "@/lib/painel/tipos";
import { faixaDaNota, type Faixa } from "@/lib/notas/faixa";
import { formatarMedia, rotuloFaixa } from "@/lib/resultados/apresentacao";
import { cn } from "@/lib/utils";
import { LinhaVariacao } from "./variacao";

const COR_FAIXA: Record<Faixa, string> = {
  boa: "bg-menta-claro text-menta-texto",
  atencao: "bg-manga-claro text-manga-texto",
  ruim: "bg-coral/15 text-coral-escuro",
};

const CARTAO = "rounded-3xl bg-card p-5 shadow-[0_8px_24px_rgba(42,31,45,0.08)]";

// Três cartões: respostas, nota média e NPS, cada um comparado com o período anterior.
// <dt>/<dd>: o leitor de tela lê "Nota média: 8,4" em vez de duas frases soltas.
export function CartoesResumo({ painel }: { painel: Painel }) {
  const { atual, anterior } = painel;
  const media = atual.media_geral;
  const nps = atual.nps;

  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      <div className={CARTAO}>
        <dt className="text-sm font-medium text-muted-foreground">Respostas</dt>
        <dd className="mt-1">
          <p className="numeros text-4xl font-bold tracking-tight">{atual.envios}</p>
          <LinhaVariacao variacao={variacaoContagem(atual.envios, anterior.envios)} tipo="contagem" className="mt-2" />
        </dd>
      </div>

      <div className={CARTAO}>
        <dt className="text-sm font-medium text-muted-foreground">Nota média</dt>
        <dd className="mt-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="numeros text-4xl font-bold tracking-tight">{formatarMedia(media)}</span>
            {media !== null && (
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", COR_FAIXA[faixaDaNota(media)])}>
                {rotuloFaixa(media)}
              </span>
            )}
          </p>
          <LinhaVariacao
            variacao={variacaoMedia(media, anterior.media_geral, atual.envios, anterior.envios)}
            tipo="media"
            className="mt-2"
          />
        </dd>
      </div>

      <div className={CARTAO}>
        <dt className="text-sm font-medium text-muted-foreground">NPS</dt>
        <dd className="mt-1">
          {nps.valor === null ? (
            <>
              <p className="numeros text-4xl font-bold tracking-tight">—</p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                Poucos dados: o NPS aparece com {MIN_NPS} respostas com nota ({nps.n} até agora).
              </p>
            </>
          ) : (
            <>
              <p className="flex flex-wrap items-center gap-2">
                <span className="numeros text-4xl font-bold tracking-tight">{nps.valor}</span>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-ameixa">{rotuloNps(nps.valor)}</span>
              </p>
              <LinhaVariacao variacao={variacaoNps(nps.valor, anterior.nps.valor)} tipo="nps" className="mt-2" />
            </>
          )}
        </dd>
      </div>
    </dl>
  );
}
