import { faixaDaNota, type Faixa } from "@/lib/notas/faixa";
import { formatarMedia, rotuloFaixa } from "@/lib/resultados/apresentacao";
import { formatarDataHora, type Envio } from "@/lib/respostas/lista";
import { cn } from "@/lib/utils";
import { BotaoDescarte } from "./botoes-descarte";

const COR_FAIXA: Record<Faixa, string> = {
  boa: "bg-menta-claro text-menta-texto",
  atencao: "bg-manga-claro text-manga-texto",
  ruim: "bg-coral/15 text-coral-escuro",
};

// A faixa vem escrita (Ótimo, Pode melhorar, Ruim), não só em cor
function SeloNota({ nota }: { nota: number }) {
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", COR_FAIXA[faixaDaNota(nota)])}>
      {rotuloFaixa(nota)}
    </span>
  );
}

// Um envio de cliente. Todo texto do cliente entra como texto comum do React (nunca como HTML).
export function CartaoEnvio({ envio }: { envio: Envio }) {
  return (
    <li
      className={cn(
        "rounded-3xl bg-card p-5 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-6",
        envio.descartada && "opacity-80",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="numeros font-semibold">{formatarDataHora(envio.criada_em)}</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {envio.suspeita && (
              <span className="rounded-full bg-manga-claro px-2.5 py-0.5 text-xs font-semibold text-manga-texto">
                Suspeita
              </span>
            )}
            {envio.descartada && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                Descartada
              </span>
            )}
          </div>
        </div>
        {envio.media !== null && (
          <div className="text-right">
            <p className="text-xs font-medium text-muted-foreground">Média do envio</p>
            <p className="flex items-center justify-end gap-2">
              <span className="numeros text-2xl font-bold tracking-tight">{formatarMedia(envio.media)}</span>
              <SeloNota nota={envio.media} />
            </p>
          </div>
        )}
      </div>

      {envio.itens.length === 0 ? (
        <p className="mt-4 text-muted-foreground">Sem respostas neste envio</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {envio.itens.map((item, i) => (
            <li key={`${item.ordem}-${i}`} className="rounded-2xl bg-creme p-4">
              {item.tipo === "nota" && item.nota !== null && (
                <div className="flex items-center gap-4">
                  <p className="min-w-0 flex-1 font-semibold break-words">{item.pergunta}</p>
                  <div className="shrink-0 text-right">
                    <p className="numeros text-3xl font-bold tracking-tight">{item.nota}</p>
                    <SeloNota nota={item.nota} />
                  </div>
                </div>
              )}
              {item.tipo === "texto" && (
                <>
                  <p className="text-sm font-semibold break-words text-muted-foreground">{item.pergunta}</p>
                  <p className="mt-1 break-words whitespace-pre-wrap">{item.texto}</p>
                </>
              )}
              {item.tipo === "funcionario" && item.funcionario && (
                <p className="break-words">
                  Atendido por <span className="font-semibold">{item.funcionario}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <BotaoDescarte id={envio.id} descartada={envio.descartada} />
      </div>
    </li>
  );
}
