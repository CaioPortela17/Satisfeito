import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconeOla } from "@/components/icones/icone-ola";
import { emailAtivo } from "@/lib/avisos/email";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { cn } from "@/lib/utils";
import { AvisosEmail } from "./avisos/avisos-email";
import { ExcluirConta } from "./conta/excluir-conta";

export const metadata: Metadata = { title: "Painel" };

// O que falta para a empresa começar a receber avaliações. Passo sem href aparece como "Em breve".
const PASSOS = [
  {
    titulo: "Cadastre quem atende",
    texto: "Seus clientes vão poder dizer quem atendeu eles.",
    href: "/painel/funcionarios",
    acao: "Cadastrar funcionários",
  },
  {
    titulo: "Monte sua pesquisa",
    texto: "Escolha as perguntas: nota de 1 a 10, texto livre e quem atendeu.",
    href: "/painel/pesquisas",
    acao: "Montar pesquisa",
  },
  {
    titulo: "Espalhe o QR code",
    texto: "Na mesa, no balcão ou na nota fiscal. Aí é só esperar as respostas.",
    href: "/painel/pesquisas",
    acao: "Ver link e QR code",
  },
];

export default async function PaginaPainel() {
  const { supabase, atual } = await obterContextoEmpresa();

  // Segunda camada de proteção: o proxy já barra quem não está logado,
  // mas a página confere de novo, verificando a assinatura do token.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");

  // Opções de aviso por e-mail da empresa aberta (o RLS só devolve se for do usuário)
  const { data: avisos } = atual
    ? await supabase.from("empresas").select("aviso_nota_baixa, relatorio_semanal").eq("id", atual.id).maybeSingle()
    : { data: null };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Olá, {atual?.nome ?? "tudo bem"}
          <IconeOla className="size-10 shrink-0" />
        </h1>
        <p className="mt-1 text-lg font-medium text-ameixa">
          Bora deixar tudo pronto pros seus clientes avaliarem?
        </p>
      </div>

      <section className="entrada rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8">
        <h2 className="text-xl font-bold">Primeiros passos</h2>
        <ol className="mt-5 space-y-5">
          {PASSOS.map((passo, i) => {
            const disponivel = Boolean(passo.href);
            return (
              <li key={passo.titulo} className="flex gap-4">
                <span
                  className={cn(
                    "numeros flex size-9 shrink-0 items-center justify-center rounded-full font-bold",
                    disponivel ? "bg-ameixa text-creme" : "bg-muted text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">
                    {passo.titulo}
                    {!disponivel && (
                      <span className="ml-2 rounded-full bg-manga-claro px-2 py-0.5 text-xs font-semibold text-manga-texto">
                        Em breve
                      </span>
                    )}
                  </h3>
                  <p className="text-muted-foreground">{passo.texto}</p>
                  {passo.href && (
                    <Link
                      href={passo.href}
                      className="mt-2 inline-flex items-center gap-1.5 font-semibold text-coral-escuro underline-offset-4 hover:underline"
                    >
                      {passo.acao}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {atual && avisos && (
        <AvisosEmail
          key={atual.id}
          empresaId={atual.id}
          notaBaixa={avisos.aviso_nota_baixa}
          relatorioSemanal={avisos.relatorio_semanal}
          emailAtivo={emailAtivo()}
        />
      )}

      <ExcluirConta />
    </div>
  );
}
