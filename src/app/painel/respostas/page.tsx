import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { listarPesquisasParaSeletor } from "@/lib/pesquisas/para-seletor";
import { escolherPesquisaPadrao } from "@/lib/resultados/apresentacao";
import { lerAba, lerPagina, type ListaRespostas } from "@/lib/respostas/lista";
import { SeletorPesquisa } from "../resultados/seletor-pesquisa";
import { Abas } from "./abas";
import { BotaoDescartarSuspeitas } from "./botoes-descarte";
import { CartaoEnvio } from "./cartao-envio";
import { Paginacao } from "./paginacao";
import { VazioRespostas } from "./vazio";

export const metadata: Metadata = { title: "Respostas" };

const SECAO = "entrada rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8";

export default async function PaginaRespostas({
  searchParams,
}: {
  searchParams: Promise<{ pesquisa?: string; aba?: string; pagina?: string }>;
}) {
  const { supabase, atual } = await obterContextoEmpresa();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");

  const { pesquisa: pedido, aba: abaPedida, pagina: paginaPedida } = await searchParams;
  const aba = lerAba(abaPedida);

  const pesquisas = await listarPesquisasParaSeletor(supabase, atual?.id);
  const escolhida = escolherPesquisaPadrao(pesquisas, pedido);

  // Sem pesquisa nenhuma ainda
  if (!escolhida) {
    return (
      <div className="max-w-3xl space-y-6">
        <Cabecalho />
        <section className={SECAO}>
          <p className="font-semibold">Nenhuma pesquisa ainda</p>
          <p className="mt-1 text-muted-foreground">Crie uma pesquisa para começar a receber respostas.</p>
        </section>
      </div>
    );
  }

  const { data: bruto, error } = await supabase.rpc("respostas_pesquisa", {
    p_pesquisa_id: escolhida,
    p_aba: aba,
    p_pagina: lerPagina(paginaPedida),
  });
  const lista = bruto as unknown as ListaRespostas | null; // Json do Supabase -> nosso tipo

  const opcoes = pesquisas.map((p) => ({
    id: p.id,
    titulo: `${p.titulo} (${p.slug})`, // o slug é único e aparece no link público
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <Cabecalho />
      {pesquisas.length > 1 && <SeletorPesquisa opcoes={opcoes} atual={escolhida} />}

      {error || !lista ? (
        <section className={SECAO}>
          <p className="font-semibold">Não deu para carregar as respostas agora</p>
          <p className="mt-1 text-muted-foreground">Recarregue a página em instantes.</p>
        </section>
      ) : (
        <>
          <Abas pesquisaId={escolhida} atual={aba} contagens={lista.contagens} />

          {aba === "suspeitas" && lista.envios.length > 0 && (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Marcamos como suspeitas as respostas de uma rajada: 4 ou mais envios com nota média 4 ou menos em 15
                minutos. Só você decide: descartar tira a resposta dos números, e dá para restaurar.
              </p>
              <BotaoDescartarSuspeitas ids={lista.envios.map((e) => e.id)} />
            </div>
          )}

          {lista.envios.length === 0 ? (
            <VazioRespostas aba={aba} />
          ) : (
            <>
              <ul className="entrada space-y-4">
                {lista.envios.map((envio) => (
                  <CartaoEnvio key={envio.id} envio={envio} />
                ))}
              </ul>
              <Paginacao pesquisaId={escolhida} aba={aba} pagina={lista.pagina} totalPaginas={lista.total_paginas} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function Cabecalho() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Respostas</h1>
      <p className="mt-1 text-lg font-medium text-ameixa">O que seus clientes escreveram.</p>
    </div>
  );
}
