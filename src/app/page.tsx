import Link from "next/link";
import { Logo } from "@/components/marca/logo";
import { Button } from "@/components/ui/button";

export default function Inicio() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <Logo className="text-5xl sm:text-6xl" />
      <div className="mt-8 w-full max-w-xl rounded-3xl bg-card p-7 text-center shadow-[0_8px_24px_rgba(42,31,45,0.12)] sm:p-10">
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Descubra o que seus clientes acham, em 30 segundos.
        </h1>
        <p className="mt-4 text-lg text-pretty text-muted-foreground">
          Um QR code na mesa, uma pesquisa rápida no celular e um painel que mostra o que
          melhorar no seu negócio.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/cadastro">Criar conta grátis</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/entrar">Entrar</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
