import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/marca/logo";

// Moldura das páginas de termos e de privacidade: logo, título, data e o texto num cartão branco.
export function PaginaLegal({ titulo, atualizadoEm, children }: { titulo: string; atualizadoEm: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center bg-menta px-4 py-6">
      <Link href="/" className="mb-5 rounded-md" aria-label="Página inicial">
        <Logo className="text-4xl" />
      </Link>
      <article className="entrada w-full max-w-3xl rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.12)] sm:p-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{titulo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Atualizada em {atualizadoEm}</p>
        <div className="mt-6 space-y-6">{children}</div>
      </article>
      <nav aria-label="Outras páginas" className="mt-5 flex flex-wrap justify-center gap-x-6 text-sm font-semibold">
        <Link href="/termos" className="inline-flex min-h-11 items-center underline underline-offset-4">
          Termos de uso
        </Link>
        <Link href="/privacidade" className="inline-flex min-h-11 items-center underline underline-offset-4">
          Política de privacidade
        </Link>
        <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">
          Voltar ao início
        </Link>
      </nav>
    </main>
  );
}

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold">{titulo}</h2>
      <div className="mt-2 space-y-3 text-pretty">{children}</div>
    </section>
  );
}

export function Lista({ itens }: { itens: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-ameixa">
      {itens.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
