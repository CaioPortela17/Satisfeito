import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { listarPesquisasParaSeletor } from "@/lib/pesquisas/para-seletor";
import { escolherPesquisaPadrao } from "@/lib/resultados/apresentacao";
import type { Resultados } from "@/lib/resultados/tipos";
import { podeGerar } from "@/lib/resumo/regras";
import type { UsoResumos } from "@/lib/resumo/tipos";
import { CartoesPerguntas } from "./cartoes-perguntas";
import { CartoesTotais } from "./cartoes-totais";
import { GraficoEvolucao } from "./grafico-evolucao";
import { RankingEquipe } from "./ranking-equipe";
import { ResumoIa } from "./resumo-ia";
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
  const pesquisas = await listarPesquisasParaSeletor(supabase, atual?.id);

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

  // Uso do resumo por IA (só faz sentido com respostas). Se a consulta falhar, uso = null
  // e a seção mostra um aviso, sem derrubar o resto da página.
  let uso: UsoResumos | null = null;
  if (!error && resultados && resultados.totais.geral > 0) {
    try {
      const { data: usoBruto } = await supabase.rpc("uso_resumos_ia", { p_pesquisa_id: escolhida });
      uso = (usoBruto as unknown as UsoResumos | null) ?? null;
    } catch {
      uso = null;
    }
  }
  const bloqueio = uso ? podeGerar(uso, new Date()) : { ok: true as const };

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
          {resultados.suspeitas > 0 && (
            <section className="entrada flex flex-col gap-3 rounded-3xl bg-manga-claro p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="font-semibold">
                  {resultados.suspeitas === 1 ? "1 resposta suspeita" : `${resultados.suspeitas} respostas suspeitas`}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Várias notas ruins em poucos minutos. Veja e decida se descarta.
                </p>
              </div>
              <Link
                href={`/painel/respostas?pesquisa=${escolhida}&aba=suspeitas`}
                className="inline-flex min-h-11 items-center font-semibold text-ameixa underline underline-offset-4"
              >
                Ver respostas suspeitas
              </Link>
            </section>
          )}

          <CartoesTotais totais={resultados.totais} />

          <section className={SECAO}>
            <h2 className="text-xl font-bold">Nota de cada pergunta</h2>
            <div className="mt-4">
              <CartoesPerguntas perguntas={resultados.perguntas} />
            </div>
          </section>

          <ResumoIa pesquisaId={escolhida} uso={uso} bloqueio={bloqueio} className={SECAO} />

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
