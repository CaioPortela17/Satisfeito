import { Check } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/marca/logo";
import { Button } from "@/components/ui/button";

const DIFERENCIAIS = [
  "Pesquisa rapidinha: o cliente responde em 30 segundos",
  "Resumo com IA: elogios e reclamações lidos em 1 minuto",
];

export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-10">
      <Logo className="text-4xl sm:text-5xl" />

      <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="entrada rounded-3xl bg-card p-7 shadow-[0_8px_24px_rgba(42,31,45,0.12)] sm:p-10">
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-[2.6rem] sm:leading-[1.1]">
            Seu cliente responde em 30 segundos. Você descobre o que melhorar.
          </h1>
          <p className="mt-4 max-w-[52ch] text-lg text-pretty text-muted-foreground">
            Um QR code na mesa, uma pesquisa rapidinha no celular e um painel que mostra o que os
            clientes andam dizendo do seu negócio.
          </p>
          <ul className="mt-6 space-y-3">
            {DIFERENCIAIS.map((item) => (
              <li key={item} className="flex items-start gap-3 font-medium">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-menta-claro">
                  <Check className="size-4 text-menta-texto" strokeWidth={3} aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/cadastro">Criar conta grátis</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/entrar">Já tenho conta</Link>
            </Button>
          </div>
        </section>

        <PesquisaDeExemplo />
      </div>

      <nav aria-label="Informações legais" className="mt-8 flex flex-wrap gap-x-6 text-sm font-semibold">
        <Link href="/termos" className="inline-flex min-h-11 items-center underline underline-offset-4">
          Termos de uso
        </Link>
        <Link href="/privacidade" className="inline-flex min-h-11 items-center underline underline-offset-4">
          Política de privacidade
        </Link>
      </nav>
    </main>
  );
}

// Celular mostrando como a pesquisa aparece para o cliente (ilustrativo)
function PesquisaDeExemplo() {
  const notas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  return (
    <figure className="entrada mx-auto w-full max-w-[290px] [animation-delay:120ms]">
      <div
        aria-hidden="true"
        className="rotate-2 rounded-[2.5rem] border-[10px] border-ameixa bg-card p-5 shadow-[0_16px_40px_rgba(42,31,45,0.25)]"
      >
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-ameixa/15" />
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold">Padaria Pão Quente</span>
          <span className="numeros text-muted-foreground">1 de 3</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-manga-claro">
          <div className="h-full w-1/3 rounded-full bg-manga" />
        </div>
        <p className="mt-5 text-lg leading-snug font-semibold">Como foi seu atendimento hoje?</p>
        <div className="numeros mt-4 grid grid-cols-5 gap-1.5">
          {notas.map((nota) => (
            <span
              key={nota}
              className={
                nota === 9
                  ? "flex h-10 items-center justify-center rounded-xl bg-manga font-bold"
                  : "flex h-10 items-center justify-center rounded-xl bg-manga-claro font-semibold"
              }
            >
              {nota}
            </span>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Ruim</span>
          <span>Excelente</span>
        </div>
        <div className="mt-5 flex h-11 items-center justify-center rounded-full bg-manga font-semibold">
          Continuar
        </div>
      </div>
      <figcaption className="mt-5 text-center text-sm font-medium text-ameixa">
        Exemplo da pesquisa no celular do cliente
      </figcaption>
    </figure>
  );
}
