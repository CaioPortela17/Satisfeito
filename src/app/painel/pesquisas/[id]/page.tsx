import { ArrowLeft, ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { esquemaIdPesquisa, LIMITE_PERGUNTAS, TIPOS_PERGUNTA } from "@/lib/pesquisas/esquemas";
import { CabecalhoPesquisa } from "./cabecalho-pesquisa";
import { CartaoLinkQr } from "./cartao-link-qr";
import { FormularioNovaPergunta } from "./formulario-nova-pergunta";
import { LinhaPergunta, LinhaPerguntaArquivada, type PerguntaEditor } from "./linha-pergunta";

export const metadata: Metadata = { title: "Editar pesquisa" };

export default async function PaginaEditorPesquisa(props: PageProps<"/painel/pesquisas/[id]">) {
  const { id: idRecebido } = await props.params;
  const { supabase, atual } = await obterContextoEmpresa();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");

  // Endereço inválido ou pesquisa de outra empresa: 404
  const id = esquemaIdPesquisa.safeParse(idRecebido);
  if (!id.success || !atual) notFound();

  const { data: pesquisa } = await supabase
    .from("pesquisas")
    .select("id, titulo, ativa, slug")
    .eq("id", id.data)
    .eq("empresa_id", atual.id)
    .maybeSingle();
  if (!pesquisa) notFound();

  const { data: perguntas } = await supabase
    .from("perguntas")
    .select("id, texto, tipo, obrigatoria, arquivada")
    .eq("pesquisa_id", pesquisa.id)
    .order("ordem");

  const todas = (perguntas ?? []) as PerguntaEditor[];
  const valendo = todas.filter((p) => !p.arquivada);
  const tiradas = todas.filter((p) => p.arquivada);
  const temFuncionarioValendo = valendo.some((p) => p.tipo === "funcionario");
  const noLimite = valendo.length >= LIMITE_PERGUNTAS;

  // Avisos que ajudam o dono a não cair em armadilha
  const { count: funcionariosAtivos } = await supabase
    .from("funcionarios")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", atual.id)
    .eq("ativo", true);
  // count vem null quando a consulta falha: nesse caso não mostramos o aviso (melhor calar do que errar)
  const semEquipe = temFuncionarioValendo && funcionariosAtivos === 0;
  const semNota = !valendo.some((p) => p.tipo === "nota");

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/painel/pesquisas"
        className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 font-semibold text-ameixa underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Pesquisas
      </Link>

      <CabecalhoPesquisa id={pesquisa.id} titulo={pesquisa.titulo} ativa={pesquisa.ativa} />

      <CartaoLinkQr pesquisaId={pesquisa.id} slug={pesquisa.slug} />

      <section className="entrada rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8">
        {/* tabIndex -1: recebe o foco quando uma pergunta sai da lista */}
        <h2 id="titulo-perguntas" tabIndex={-1} className="text-xl font-bold outline-none">
          Perguntas <span className="numeros text-muted-foreground">({valendo.length})</span>
        </h2>
        <p id="anuncio-perguntas" role="status" className="sr-only" />

        {(semEquipe || semNota) && (
          <ul className="mt-4 space-y-2">
            {semEquipe && (
              <li className="rounded-2xl bg-manga-claro p-3 text-sm font-medium text-manga-texto">
                A pergunta &ldquo;Quem te atendeu?&rdquo; só aparece para o cliente quando houver
                funcionários ativos.{" "}
                <Link
                  href="/painel/funcionarios"
                  className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
                >
                  Cadastrar a equipe
                </Link>
              </li>
            )}
            {semNota && (
              <li className="rounded-2xl bg-manga-claro p-3 text-sm font-medium text-manga-texto">
                Sem uma pergunta de nota, o painel não terá médias nem gráficos.
              </li>
            )}
          </ul>
        )}

        {valendo.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            Nenhuma pergunta valendo. Adicione uma logo abaixo.
          </p>
        ) : (
          <ol className="mt-2 divide-y divide-border">
            {valendo.map((p, i) => (
              <LinhaPergunta key={p.id} pergunta={p} posicao={i + 1} total={valendo.length} />
            ))}
          </ol>
        )}

        <div className="mt-6 border-t border-border pt-6">
          <h3 className="mb-4 text-lg font-bold">Adicionar pergunta</h3>
          <FormularioNovaPergunta
            pesquisaId={pesquisa.id}
            tiposDisponiveis={TIPOS_PERGUNTA.filter((t) => t !== "funcionario" || !temFuncionarioValendo)}
            noLimite={noLimite}
          />
        </div>

        {tiradas.length > 0 && (
          <details className="group mt-6 border-t border-border pt-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-lg font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
              Tiradas da pesquisa{" "}
              <span className="numeros ml-1 text-muted-foreground">({tiradas.length})</span>
              <ChevronDown
                className="ml-auto size-5 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </summary>
            <p className="mb-1 text-sm text-muted-foreground">
              Não aparecem para o cliente, mas as respostas antigas continuam no painel.
            </p>
            <ul className="divide-y divide-border">
              {tiradas.map((p) => (
                <LinhaPerguntaArquivada
                  key={p.id}
                  pergunta={p}
                  podeDevolver={!noLimite && !(p.tipo === "funcionario" && temFuncionarioValendo)}
                />
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}
