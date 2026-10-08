import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { escolherPesquisaPadrao } from "@/lib/resultados/apresentacao";
import type { Resultados } from "@/lib/resultados/tipos";
import { CartoesPerguntas } from "./cartoes-perguntas";
import { CartoesTotais } from "./cartoes-totais";
import { GraficoEvolucao } from "./grafico-evolucao";
import { RankingEquipe } from "./ranking-equipe";
import { SeletorPesquisa } from "./seletor-pesquisa";
import { Vazio } from "./vazio";

export const metadata: Metadata = { title: "Resultados" };

const SECAO = "entrada rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8";

export default async function PaginaResultados({
  searchParams,
}: {
  searchParams: Promise<{ pesquisa?: string }>;
}) {
  const { supabase, atual } = await obterContextoEmpresa();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");

  const { pesquisa: pedido } = await searchParams;

  // Pesquisas da empresa atual, da mais recente para a mais antiga, com quantos envios cada uma tem
  const { data: linhas } = atual
    ? await supabase
        .from("pesquisas")
        .select("id, titulo, slug, respostas(count)")
        .eq("empresa_id", atual.id)
        .order("created_at", { ascending: false })
    : { data: [] };
  const pesquisas = (linhas ?? []).map((p) => ({
    id: p.id,
    titulo: p.titulo,
    slug: p.slug,
    respostas: p.respostas[0]?.count ?? 0,
  }));

  const escolhida = escolherPesquisaPadrao(pesquisas, pedido);

  // Sem pesquisa nenhuma ainda
  if (!escolhida) {
    return (
      <div className="max-w-2xl space-y-6">
        <Cabecalho />
        <section className={SECAO}>
          <p className="font-semibold">Nenhuma pesquisa ainda</p>
          <p className="mt-1 text-muted-foreground">Crie uma pesquisa para começar a receber respostas.</p>
        </section>
      </div>
    );
  }

  const { data: bruto, error } = await supabase.rpc("resultados_pesquisa", { p_pesquisa_id: escolhida });
  const resultados = bruto as unknown as Resultados | null; // Json do Supabase -> nosso tipo

  const opcoes = pesquisas.map((p) => ({
    id: p.id,
    titulo: `${p.titulo} (${p.slug})`, // o slug é único e aparece no link público
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <Cabecalho />
      {pesquisas.length > 1 && <SeletorPesquisa opcoes={opcoes} atual={escolhida} />}

      {error || !resultados ? (
        <section className={SECAO}>
          <p className="font-semibold">Não deu para carregar os resultados agora</p>
          <p className="mt-1 text-muted-foreground">Recarregue a página em instantes.</p>
        </section>
      ) : resultados.totais.geral === 0 ? (
        <Vazio pesquisaId={escolhida} />
      ) : (
        <>
          <CartoesTotais totais={resultados.totais} />

          <section className={SECAO}>
            <h2 className="text-xl font-bold">Nota de cada pergunta</h2>
            <div className="mt-4">
              <CartoesPerguntas perguntas={resultados.perguntas} />
            </div>
          </section>

          <section className={SECAO}>
            <h2 className="text-xl font-bold">Evolução nos últimos 30 dias</h2>
            <div className="mt-4">
              <GraficoEvolucao dados={resultados.evolucao} />
            </div>
          </section>

          {resultados.equipe.length > 0 && (
            <section className={SECAO}>
              <h2 className="text-xl font-bold">Ranking da equipe</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Média das notas dos clientes que escolheram cada pessoa em &ldquo;Quem te atendeu?&rdquo;.
              </p>
              <div className="mt-4">
                <RankingEquipe equipe={resultados.equipe} />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Cabecalho() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Resultados</h1>
      <p className="mt-1 text-lg font-medium text-ameixa">Como seus clientes estão avaliando.</p>
    </div>
  );
}
