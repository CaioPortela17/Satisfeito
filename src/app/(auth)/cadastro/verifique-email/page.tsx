import type { Metadata } from "next";
import Link from "next/link";
import { IconeEmail } from "@/components/icones/icone-email";

export const metadata: Metadata = { title: "Confira seu e-mail" };

export default function PaginaVerifiqueEmail() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-3xl bg-manga-claro">
        <IconeEmail className="size-12" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">Confira seu e-mail</h1>
      <p className="mt-3 text-base text-muted-foreground">
        Falta pouco! Mandamos um link pro seu e-mail. É só tocar nele para ativar a conta.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Não chegou? Dá uma olhada no spam ou espera uns minutinhos.
      </p>
      <Link href="/entrar" className="mt-6 inline-block text-sm font-semibold underline underline-offset-4">
        Voltar para Entrar
      </Link>
    </div>
  );
}
