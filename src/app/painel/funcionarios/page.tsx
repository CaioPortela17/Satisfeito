import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IconeEquipe } from "@/components/icones/icone-equipe";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { FormularioAdicionar } from "./formulario-adicionar";
import { type Funcionario, LinhaFuncionario } from "./linha-funcionario";

export const metadata: Metadata = { title: "Funcionários" };

export default async function PaginaFuncionarios() {
  const { supabase, atual } = await obterContextoEmpresa();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");

  // O RLS já esconde os funcionários de outros donos;
  // o filtro escolhe só os da empresa que está aberta no seletor
  const { data: funcionarios } = atual
    ? await supabase
        .from("funcionarios")
        .select("id, nome, ativo")
        .eq("empresa_id", atual.id)
        .order("nome")
    : { data: [] };

  const ativos = funcionarios?.filter((f) => f.ativo) ?? [];
  const inativos = funcionarios?.filter((f) => !f.ativo) ?? [];
  const vazio = ativos.length === 0 && inativos.length === 0;

  return (
    // Alinhado à esquerda com o logo, como a página inicial; largura menor porque é só uma lista
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Funcionários</h1>
        <p className="mt-1 text-lg font-medium text-ameixa">
          Quem aparece na pergunta &ldquo;Quem te atendeu?&rdquo;
        </p>
      </div>

      <section className="entrada rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8">
        <FormularioAdicionar />

        {vazio ? (
          <div className="flex flex-col items-center pt-8 pb-2 text-center">
            <div className="mb-4 flex size-20 items-center justify-center rounded-3xl bg-manga-claro">
              <IconeEquipe className="size-12" />
            </div>
            <p className="font-semibold">Ninguém na equipe ainda</p>
            <p className="mt-1 max-w-sm text-muted-foreground">
              Adicione quem atende seus clientes. Se você toca o negócio sozinho, pode pular esta
              parte.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <ListaFuncionarios titulo="Ativos" funcionarios={ativos} />
            {inativos.length > 0 && <ListaFuncionarios titulo="Inativos" funcionarios={inativos} />}
          </div>
        )}
      </section>
    </div>
  );
}

function ListaFuncionarios({
  titulo,
  funcionarios,
}: {
  titulo: string;
  funcionarios: Funcionario[];
}) {
  if (funcionarios.length === 0) return null;

  return (
    <div>
      <h2 className="mb-1 font-semibold">
        {titulo} <span className="numeros text-muted-foreground">({funcionarios.length})</span>
      </h2>
      <ul className="divide-y divide-border">
        {funcionarios.map((f) => (
          <LinhaFuncionario key={f.id} funcionario={f} />
        ))}
      </ul>
    </div>
  );
}
