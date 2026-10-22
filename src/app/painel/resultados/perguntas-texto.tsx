import Link from "next/link";
import type { PerguntaTexto } from "@/lib/painel/textos-recentes";

function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}

// Perguntas de texto: quantas pessoas escreveram e as respostas mais novas.
// Texto de cliente é sempre renderizado como texto (o React escapa), nunca como HTML.
export function PerguntasTexto({
  perguntas,
  pesquisaId,
}: {
  perguntas: PerguntaTexto[] | null;
  pesquisaId: string;
}) {
  if (perguntas === null) {
    return <p className="text-sm text-muted-foreground">Não deu para carregar as respostas escritas agora. Recarregue a página.</p>;
  }
  if (perguntas.length === 0) return null;

  return (
    <ul className="space-y-3">
      {perguntas.map((p) => (
        <li key={p.id} className="rounded-2xl bg-creme p-4">
          <p className="font-semibold break-words">{p.tipo === "nota" ? `${p.texto} (onde podemos melhorar)` : p.texto}</p>
          <p className="numeros text-sm text-muted-foreground">
            {p.tipo === "nota"
              ? p.total === 1
                ? "1 comentário de quem deu nota baixa"
                : `${p.total} comentários de quem deu nota baixa`
              : p.total === 0
                ? "Ninguém escreveu neste período"
                : p.total === 1
                  ? "1 pessoa escreveu"
                  : `${p.total} pessoas escreveram`}
          </p>
          {p.recentes.length > 0 && (
            <>
              <ul className="mt-3 space-y-2">
                {p.recentes.map((r, i) => (
                  <li key={`${r.quando}-${i}`} className="rounded-xl bg-card p-3">
                    <p className="break-words whitespace-pre-line">{r.texto}</p>
                    <p className="numeros mt-1 text-xs text-muted-foreground">
                      {r.nota !== undefined && <span className="mr-2 font-semibold">Nota {r.nota}</span>}
                      {dataCurta(r.quando)}
                    </p>
                  </li>
                ))}
              </ul>
              <Link
                href={`/painel/respostas?pesquisa=${pesquisaId}`}
                className="mt-3 inline-flex min-h-11 items-center font-semibold text-ameixa underline underline-offset-4"
              >
                Ver todas as respostas
              </Link>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
