import Link from "next/link";
import { Logo } from "@/components/marca/logo";
import { Button } from "@/components/ui/button";

export default function Inicio() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Logo className="text-5xl sm:text-6xl" />
      <h1 className="mt-8 max-w-xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        Descubra o que seus clientes acham, em 30 segundos.
      </h1>
      <p className="mt-4 max-w-md text-lg text-pretty text-muted-foreground">
        Um QR code na mesa, uma pesquisa rápida no celular e um painel que mostra o que
        melhorar no seu negócio.
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
        <Button asChild size="lg" className="bg-coral text-ameixa hover:bg-coral/90">
          <Link href="/cadastro">Criar conta grátis</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/entrar">Entrar</Link>
        </Button>
      </div>
    </main>
  );
}
