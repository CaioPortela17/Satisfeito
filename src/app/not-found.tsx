import type { Metadata } from "next";
import Link from "next/link";
import { IconePerdido } from "@/components/icones/icone-perdido";
import { Logo } from "@/components/marca/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página não encontrada" };

// Aparece em qualquer endereço que não existe (erro 404)
export default function NaoEncontrada() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-menta px-4 py-5">
      <Link href="/" className="mb-4 rounded-md" aria-label="Página inicial">
        <Logo className="text-4xl" />
      </Link>
      <div className="entrada w-full max-w-md rounded-3xl bg-card p-6 text-center shadow-[0_8px_24px_rgba(42,31,45,0.12)] sm:p-8">
        <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-3xl bg-manga-claro">
          <IconePerdido className="size-12" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">
          Essa página não existe?!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Esse endereço não leva a lugar nenhum (erro 404). Pode ser um link digitado errado ou uma página que saiu do ar.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/">Ir para o início</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/painel">Abrir o painel</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
