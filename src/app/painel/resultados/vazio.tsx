import Link from "next/link";
import { IconePesquisa } from "@/components/icones/icone-pesquisa";
import { Button } from "@/components/ui/button";

// Pesquisa sem nenhuma resposta ainda
export function Vazio({ pesquisaId }: { pesquisaId: string }) {
  return (
    <section className="entrada flex flex-col items-center rounded-3xl bg-card p-8 text-center shadow-[0_8px_24px_rgba(42,31,45,0.08)]">
      <div className="mb-4 flex size-20 items-center justify-center rounded-3xl bg-manga-claro">
        <IconePesquisa className="size-12" />
      </div>
      <h2 className="text-xl font-bold">Ainda sem respostas</h2>
      <p className="mt-1 mb-5 max-w-sm text-muted-foreground">
        Assim que o primeiro cliente responder, os números aparecem aqui. Pegue o link ou o QR code e coloque na mesa ou no balcão.
      </p>
      <Button asChild size="lg">
        <Link href={`/painel/pesquisas/${pesquisaId}`}>Ver link e QR code</Link>
      </Button>
    </section>
  );
}
