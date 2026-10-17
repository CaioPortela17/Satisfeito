import { percentual } from "@/lib/painel/apresentacao";
import type { FaixaDistribuicao, Nps } from "@/lib/painel/tipos";

// Cada faixa tem número, porcentagem e palavra: a barra colorida é só enfeite (aria-hidden)
const FAIXAS: Record<FaixaDistribuicao["faixa"], { rotulo: string; cor: string }> = {
  "1-3": { rotulo: "Notas 1 a 3: ruim", cor: "bg-coral" },
  "4-6": { rotulo: "Notas 4 a 6: pode melhorar", cor: "bg-manga" },
  "7-8": { rotulo: "Notas 7 e 8: bom", cor: "bg-menta/70" },
  "9-10": { rotulo: "Notas 9 e 10: ótimo", cor: "bg-menta" },
};

// Quantos envios ficaram em cada faixa de nota (a nota do envio é a média das notas dele).
export function DistribuicaoNotas({ distribuicao, nps }: { distribuicao: FaixaDistribuicao[]; nps: Nps }) {
  const total = distribuicao.reduce((soma, f) => soma + f.envios, 0);
  if (total === 0) {
    return <p className="text-muted-foreground">Ainda não há notas neste período.</p>;
  }
  return (
    <div>
      <ul className="space-y-3">
        {distribuicao.map((f) => {
          const pct = percentual(f.envios, total);
          const info = FAIXAS[f.faixa];
          return (
            <li key={f.faixa}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="font-semibold">{info.rotulo}</p>
                <p className="numeros shrink-0 text-sm text-muted-foreground">
                  {f.envios === 1 ? "1 resposta" : `${f.envios} respostas`} ({pct}%)
                </p>
              </div>
              <div aria-hidden="true" className="mt-1 h-3 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${info.cor}`} style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      {nps.n > 0 && (
        <p className="numeros mt-4 text-sm text-muted-foreground">
          Promotores (9 e 10): {nps.promotores}. Neutros (7 e 8): {nps.neutros}. Detratores (1 a 6): {nps.detratores}.
        </p>
      )}
    </div>
  );
}
