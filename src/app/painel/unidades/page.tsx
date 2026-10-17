import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { extremos, rotuloNps, variacaoContagem, variacaoMedia, variacaoNps } from "@/lib/painel/apresentacao";
import { lerDias } from "@/lib/painel/periodo";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { faixaDaNota, type Faixa } from "@/lib/notas/faixa";
import { formatarMedia, rotuloFaixa } from "@/lib/resultados/apresentacao";
import { cn } from "@/lib/utils";
import { LinhaVariacao } from "../resultados/variacao";
import { SeletorPeriodo } from "../resultados/seletor-periodo";
import { BotaoAbrirUnidade } from "./botao-abrir-unidade";

export const metadata: Metadata = { title: "Unidades" };

type Unidade = {
  id: string;
  nome: string;
  envios: number;
  media: number | null;
  nps: number | null;
  envios_anterior: number;
  media_anterior: number | null;
  nps_anterior: number | null;
};

const SECAO = "entrada rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8";
const COR_FAIXA: Record<Faixa, string> = {
  boa: "bg-menta-claro text-menta-texto",
  atencao: "bg-manga-claro text-manga-texto",
  ruim: "bg-coral/15 text-coral-escuro",
};

export default async function PaginaUnidades({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const { supabase, empresas, atual } = await obterContextoEmpresa();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");
  // Comparar só faz sentido com mais de uma unidade
  if (empresas.length < 2) redirect("/painel/resultados");

  const dias = lerDias((await searchParams).dias);
  const { data: bruto, error } = await supabase.rpc("comparar_unidades", { p_dias: dias });
  const unidades = (bruto as unknown as Unidade[] | null) ?? [];

  // Da melhor nota para a pior; quem ainda não tem nota vai para o fim
  const ordenadas = [...unidades].sort((a, b) => (b.media ?? -1) - (a.media ?? -1) || b.envios - a.envios);
  const { melhor, pior } = extremos(ordenadas.map((u) => ({ media: u.media, envios: u.envios })));

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Unidades</h1>
        <p className="mt-1 text-lg font-medium text-ameixa">Compare suas empresas lado a lado.</p>
      </div>
      <SeletorPeriodo atual={dias} />

      {error || unidades.length === 0 ? (
        <section className={SECAO}>
          <p className="font-semibold">Não deu para carregar as unidades agora</p>
          <p className="mt-1 text-muted-foreground">Recarregue a página em instantes.</p>
        </section>
      ) : (
        <ul className="space-y-4">
          {ordenadas.map((u, i) => (
            <li key={u.id} className={cn(SECAO, "space-y-4")}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold break-words">{u.nome}</h2>
                {u.id === atual?.id && (
                  <span className="rounded-full bg-manga-claro px-2.5 py-0.5 text-xs font-semibold text-manga-texto">aberta agora</span>
                )}
                {i === melhor && (
                  <span className="rounded-full bg-menta-claro px-2.5 py-0.5 text-xs font-semibold text-menta-texto">melhor nota</span>
                )}
                {i === pior && (
                  <span className="rounded-full bg-coral/15 px-2.5 py-0.5 text-xs font-semibold text-coral-escuro">nota mais baixa</span>
                )}
              </div>

              <dl className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-creme p-4">
                  <dt className="text-sm font-medium text-muted-foreground">Respostas</dt>
                  <dd className="mt-1">
                    <p className="numeros text-3xl font-bold tracking-tight">{u.envios}</p>
                    <LinhaVariacao variacao={variacaoContagem(u.envios, u.envios_anterior)} tipo="contagem" className="mt-1" />
                  </dd>
                </div>
                <div className="rounded-2xl bg-creme p-4">
                  <dt className="text-sm font-medium text-muted-foreground">Nota média</dt>
                  <dd className="mt-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="numeros text-3xl font-bold tracking-tight">{formatarMedia(u.media)}</span>
                      {u.media !== null && (
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", COR_FAIXA[faixaDaNota(u.media)])}>
                          {rotuloFaixa(u.media)}
                        </span>
                      )}
                    </p>
                    <LinhaVariacao
                      variacao={variacaoMedia(u.media, u.media_anterior, u.envios, u.envios_anterior)}
                      tipo="media"
                      className="mt-1"
                    />
                  </dd>
                </div>
                <div className="rounded-2xl bg-creme p-4">
                  <dt className="text-sm font-medium text-muted-foreground">NPS</dt>
                  <dd className="mt-1">
                    {u.nps === null ? (
                      <>
                        <p className="numeros text-3xl font-bold tracking-tight">—</p>
                        <p className="mt-1 text-sm font-medium text-muted-foreground">Poucos dados</p>
                      </>
                    ) : (
                      <>
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="numeros text-3xl font-bold tracking-tight">{u.nps}</span>
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-ameixa">{rotuloNps(u.nps)}</span>
                        </p>
                        <LinhaVariacao variacao={variacaoNps(u.nps, u.nps_anterior)} tipo="nps" className="mt-1" />
                      </>
                    )}
                  </dd>
                </div>
              </dl>

              <BotaoAbrirUnidade id={u.id} nome={u.nome} atual={u.id === atual?.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
