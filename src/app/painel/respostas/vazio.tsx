import { IconePesquisa } from "@/components/icones/icone-pesquisa";
import type { Aba } from "@/lib/respostas/lista";

const TEXTOS: Record<Aba, { titulo: string; texto: string }> = {
  todas: { titulo: "Ainda sem respostas", texto: "Quando um cliente responder, o envio aparece aqui." },
  suspeitas: {
    titulo: "Nenhuma resposta suspeita",
    texto: "Se aparecer uma rajada de notas ruins em poucos minutos, ela aparece aqui para você decidir.",
  },
  descartadas: {
    titulo: "Nenhuma resposta descartada",
    texto: "As respostas que você descartar ficam aqui e podem ser restauradas.",
  },
};

// Aba sem nenhum envio
export function VazioRespostas({ aba }: { aba: Aba }) {
  const { titulo, texto } = TEXTOS[aba];
  return (
    <section className="entrada flex flex-col items-center rounded-3xl bg-card p-8 text-center shadow-[0_8px_24px_rgba(42,31,45,0.08)]">
      <div className="mb-4 flex size-20 items-center justify-center rounded-3xl bg-manga-claro">
        <IconePesquisa className="size-12" />
      </div>
      <h2 className="text-xl font-bold">{titulo}</h2>
      <p className="mt-1 max-w-sm text-muted-foreground">{texto}</p>
    </section>
  );
}
