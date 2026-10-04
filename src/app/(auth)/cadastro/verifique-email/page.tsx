import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Confira seu e-mail" };

export default function PaginaVerifiqueEmail() {
  return (
    <div className="text-center">
      <div aria-hidden="true" className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-manga-claro text-3xl">
        ✉️
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Confira seu e-mail</h1>
      <p className="mt-3 text-base text-muted-foreground">
        Enviamos um link de confirmação. Abra o e-mail e toque no link para ativar sua conta.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Não chegou? Olhe a caixa de spam ou espere alguns minutos.
      </p>
      <Link href="/entrar" className="mt-6 inline-block text-sm font-semibold underline underline-offset-4">
        Voltar para Entrar
      </Link>
    </div>
  );
}
