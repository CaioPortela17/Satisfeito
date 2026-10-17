import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { listarPesquisasParaSeletor } from "@/lib/pesquisas/para-seletor";
import { lerDias } from "@/lib/painel/periodo";
import type { Painel } from "@/lib/painel/tipos";
import { escolherPesquisaPadrao } from "@/lib/resultados/apresentacao";
import { podeGerar } from "@/lib/resumo/regras";
import type { UsoResumos } from "@/lib/resumo/tipos";
import { CartoesPerguntas } from "./cartoes-perguntas";
import { CartoesResumo } from "./cartoes-resumo";
import { Destaques } from "./destaques";
import { DiaETurno } from "./dia-e-turno";
import { DistribuicaoNotas } from "./distribuicao-notas";
import { GraficoEvolucao } from "./grafico-evolucao";
import { RankingEquipe } from "./ranking-equipe";
import { ResumoIa } from "./resumo-ia";
import { SeletorPeriodo } from "./seletor-periodo";
import { SeletorPesquisa } from "./seletor-pesquisa";
import { Vazio } from "./vazio";

export const metadata: Metadata = { title: "Resultados" };

const SECAO = "entrada rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8";

export default async function PaginaResultados({
  searchParams,
}: {
  searchParams: Promise<{ pesquisa?: string; dias?: string }>;
}) {
  const { supabase, atual } = await obterContextoEmpresa();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");

  const { pesquisa: pedido, dias: diasPedido } = await searchParams;
  const dias = lerDias(diasPedido);

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

  const semRespostas = (pesquisas.find((p) => p.id === escolhida)?.respostas ?? 0) === 0;

  // Todos os números do período (e do anterior) vêm de uma única função do banco
  let painel: Painel | null = null;
  let falhou = false;
  if (!semRespostas) {
    const { data: bruto, error } = await supabase.rpc("painel_pesquisa", { p_pesquisa_id: escolhida, p_dias: dias });
    painel = (bruto as unknown as Painel | null) ?? null;
    falhou = Boolean(error) || !painel;
  }

  // Uso do resumo por IA (só faz sentido com respostas). Se a consulta falhar, uso = null
  // e a seção mostra um aviso, sem derrubar o resto da página.
  let uso: UsoResumos | null = null;
  if (painel) {
    try {
      const { data: usoBruto } = await supabase.rpc("uso_resumos_ia", { p_pesquisa_id: escolhida, p_dias: dias });
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
    <div className="max-w-4xl space-y-6">
      <Cabecalho />
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        {pesquisas.length > 1 && <SeletorPesquisa opcoes={opcoes} atual={escolhida} />}
        {!semRespostas && <SeletorPeriodo atual={dias} />}
      </div>

      {semRespostas ? (
        <Vazio pesquisaId={escolhida} />
      ) : falhou || !painel ? (
        <section className={SECAO}>
          <p className="font-semibold">Não deu para carregar os resultados agora</p>
          <p className="mt-1 text-muted-foreground">Recarregue a página em instantes.</p>
        </section>
      ) : painel.atual.envios === 0 ? (
        <section className={SECAO}>
          <p className="font-semibold">Nenhuma resposta nos últimos {dias} dias</p>
          <p className="mt-1 text-muted-foreground">
            {dias < 90 ? "Escolha um período maior para ver as respostas mais antigas." : "Esta pesquisa tem respostas só de antes desse período."}
          </p>
        </section>
      ) : (
        <>
          {painel.suspeitas > 0 && (
            <section className="entrada flex flex-col gap-3 rounded-3xl bg-manga-claro p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="font-semibold">
                  {painel.suspeitas === 1 ? "1 resposta suspeita" : `${painel.suspeitas} respostas suspeitas`}
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

          <CartoesResumo painel={painel} />

          <Destaques destaques={painel.destaques} className={SECAO} />

          <section className={SECAO}>
            <h2 className="text-xl font-bold">Como as notas se distribuem</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cada resposta conta pela média das notas que o cliente deu.
            </p>
            <div className="mt-4">
              <DistribuicaoNotas distribuicao={painel.atual.distribuicao} nps={painel.atual.nps} />
            </div>
          </section>

          <section className={SECAO}>
            <h2 className="text-xl font-bold">Evolução nos últimos {dias} dias</h2>
            <div className="mt-4">
              <GraficoEvolucao dados={painel.evolucao} dias={dias} />
            </div>
          </section>

          <section className={SECAO}>
            <h2 className="text-xl font-bold">Quando o cliente está mais satisfeito</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nota média por dia da semana e por turno. Com menos de 3 respostas, o número ainda não diz muito.
            </p>
            <div className="mt-4">
              <DiaETurno diaSemana={painel.dia_semana} turno={painel.turno} />
            </div>
          </section>

          <section className={SECAO}>
            <h2 className="text-xl font-bold">Nota de cada pergunta</h2>
            <div className="mt-4">
              <CartoesPerguntas perguntas={painel.perguntas} enviosAnterior={painel.anterior.envios} />
            </div>
          </section>

          {painel.equipe.length > 0 && (
            <section className={SECAO}>
              <h2 className="text-xl font-bold">Ranking da equipe</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Média das notas dos clientes que escolheram cada pessoa em &ldquo;Quem te atendeu?&rdquo;.
              </p>
              <div className="mt-4">
                <RankingEquipe equipe={painel.equipe} enviosAnterior={painel.anterior.envios} />
              </div>
            </section>
          )}

          <ResumoIa
            pesquisaId={escolhida}
            uso={uso}
            bloqueio={bloqueio}
            dias={dias}
            enviosNoPeriodo={painel.atual.envios}
            className={SECAO}
          />
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
