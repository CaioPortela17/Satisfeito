import { MIN_CELULA, extremos, nomeDia, rotuloTurno } from "@/lib/painel/apresentacao";
import type { DiaSemana, Turno } from "@/lib/painel/tipos";
import { faixaDaNota, type Faixa } from "@/lib/notas/faixa";
import { formatarMedia } from "@/lib/resultados/apresentacao";
import { cn } from "@/lib/utils";

const COR_BARRA: Record<Faixa, string> = { boa: "bg-menta", atencao: "bg-manga", ruim: "bg-coral" };

type Linha = { chave: string; rotulo: string; media: number | null; envios: number };

// Uma lista de barras: nota média de cada dia (ou turno). Célula com menos de 3 envios fica esmaecida e
// diz "poucos dados"; entre as que têm dados suficientes, a melhor e a mais fraca levam uma palavra.
function ListaBarras({ linhas, titulo, id }: { linhas: Linha[]; titulo: string; id: string }) {
  const { melhor, pior } = extremos(linhas);
  return (
    <div>
      <h3 id={id} className="font-semibold">
        {titulo}
      </h3>
      <ul aria-labelledby={id} className="mt-3 space-y-2.5">
        {linhas.map((l, i) => {
          const vazio = l.media === null;
          const poucos = !vazio && l.envios < MIN_CELULA;
          return (
            <li key={l.chave} className={cn(poucos && "opacity-70")}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">
                  {l.rotulo}
                  {i === melhor && (
                    <span className="ml-2 rounded-full bg-menta-claro px-2 py-0.5 text-xs font-semibold text-menta-texto">melhor</span>
                  )}
                  {i === pior && (
                    <span className="ml-2 rounded-full bg-coral/15 px-2 py-0.5 text-xs font-semibold text-coral-escuro">mais fraco</span>
                  )}
                </p>
                <p className="numeros shrink-0 text-sm text-muted-foreground">
                  {vazio ? (
                    "Sem respostas"
                  ) : (
                    <>
                      <span className="font-semibold text-foreground">{formatarMedia(l.media)}</span> ·{" "}
                      {l.envios === 1 ? "1 resposta" : `${l.envios} respostas`}
                      {poucos && " (poucos dados)"}
                    </>
                  )}
                </p>
              </div>
              {!vazio && (
                <div aria-hidden="true" className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", poucos ? "bg-muted-foreground/40" : COR_BARRA[faixaDaNota(l.media as number)])}
                    style={{ width: `${(l.media as number) * 10}%` }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// "Quando o cliente está mais feliz": dia da semana e turno, lado a lado no computador.
export function DiaETurno({ diaSemana, turno }: { diaSemana: DiaSemana[]; turno: Turno[] }) {
  const dias: Linha[] = diaSemana.map((d) => ({ chave: String(d.dia), rotulo: nomeDia(d.dia), media: d.media, envios: d.envios }));
  const turnos: Linha[] = turno.map((t) => ({ chave: t.turno, rotulo: rotuloTurno(t.turno), media: t.media, envios: t.envios }));
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <ListaBarras id="titulo-dias" titulo="Por dia da semana" linhas={dias} />
      <ListaBarras id="titulo-turnos" titulo="Por turno" linhas={turnos} />
    </div>
  );
}
