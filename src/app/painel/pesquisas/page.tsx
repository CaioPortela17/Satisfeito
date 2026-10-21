import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconePesquisa } from "@/components/icones/icone-pesquisa";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { cn } from "@/lib/utils";
import { BotaoCriarPesquisa } from "./botao-criar-pesquisa";

export const metadata: Metadata = { title: "Pesquisas" };

export default async function PaginaPesquisas() {
  const { supabase, atual } = await obterContextoEmpresa();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");

  // perguntas(count) conta só as que valem (não arquivadas); respostas(count) ignora as descartadas.
  // O filtro em tabela embutida (sem !inner) só limita as linhas embutidas: a pesquisa sem
  // respostas continua na lista, com contagem 0.
  const { data: pesquisas } = atual
    ? await supabase
        .from("pesquisas")
        .select("id, titulo, slug, ativa, perguntas(count), respostas(count)")
        .eq("empresa_id", atual.id)
        .eq("perguntas.arquivada", false)
        .eq("respostas.descartada", false)
        .order("created_at", { ascending: false })
    : { data: [] };

  const lista = pesquisas ?? [];

  return (
    // Alinhado à esquerda com o logo, como as outras páginas do painel
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Pesquisas</h1>
          <p className="mt-1 text-lg font-medium text-ameixa">
            O que seus clientes respondem pelo QR code.
          </p>
        </div>
        {lista.length > 0 && <BotaoCriarPesquisa />}
      </div>

      <section className="entrada rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8">
        {lista.length === 0 ? (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 flex size-20 items-center justify-center rounded-3xl bg-manga-claro">
              <IconePesquisa className="size-12" />
            </div>
            <p className="font-semibold">Nenhuma pesquisa ainda</p>
            <p className="mt-1 mb-5 max-w-sm text-muted-foreground">
              Sua primeira pesquisa fica pronta em 1 minuto: ela já vem com perguntas sugeridas.
            </p>
            <BotaoCriarPesquisa />
          </div>
        ) : (
          <ul className="-my-2 divide-y divide-border">
            {lista.map((p) => {
              const total = p.perguntas[0]?.count ?? 0;
              const recebidas = p.respostas[0]?.count ?? 0;
              return (
                <li key={p.id}>
                  <Link
                    href={`/painel/pesquisas/${p.id}`}
                    className="-mx-3 grid min-h-16 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 rounded-2xl sm:flex sm:gap-y-0 px-3 py-3 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold break-words">{p.titulo}</p>
                      {/* Títulos iguais são comuns: o final do link e os números ajudam a distinguir */}
                      <p className="numeros flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
                        <span className="font-mono break-all">/p/{p.slug}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {total} {total === 1 ? "pergunta" : "perguntas"}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {recebidas} {recebidas === 1 ? "resposta" : "respostas"}
                        </span>
                      </p>
                    </div>
                    <span
                      className={cn(
                        // No celular a pílula fica numa linha própria, embaixo do texto
                        "row-start-2 shrink-0 justify-self-start rounded-full px-2.5 py-1 text-xs font-semibold sm:row-auto sm:justify-self-auto",
                        p.ativa ? "bg-menta-claro text-menta-texto" : "bg-manga-claro text-manga-texto",
                      )}
                    >
                      {p.ativa ? "Recebendo respostas" : "Pausada"}
                    </span>
                    <ChevronRight aria-hidden="true" className="col-start-2 row-start-1 size-5 shrink-0 text-muted-foreground sm:col-auto sm:row-auto" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
