import { nomeDia } from "@/lib/painel/apresentacao";
import type { Destaques as DadosDestaques } from "@/lib/painel/tipos";
import { formatarMedia } from "@/lib/resultados/apresentacao";

type Item = { chave: string; rotulo: string; titulo: string; detalhe: string; valor: string };

function montarItens(d: DadosDestaques): Item[] {
  const itens: Item[] = [];
  if (d.melhor_pergunta) {
    itens.push({ chave: "melhor", rotulo: "Pergunta mais bem avaliada", titulo: d.melhor_pergunta.texto, detalhe: "", valor: formatarMedia(d.melhor_pergunta.media) });
  }
  if (d.pior_pergunta) {
    itens.push({ chave: "pior", rotulo: "Pergunta com a nota mais baixa", titulo: d.pior_pergunta.texto, detalhe: "", valor: formatarMedia(d.pior_pergunta.media) });
  }
  if (d.dia_mais_fraco) {
    itens.push({
      chave: "dia",
      rotulo: "Dia mais fraco",
      titulo: nomeDia(d.dia_mais_fraco.dia),
      detalhe: d.dia_mais_fraco.envios === 1 ? "1 resposta" : `${d.dia_mais_fraco.envios} respostas`,
      valor: formatarMedia(d.dia_mais_fraco.media),
    });
  }
  if (d.melhor_funcionario) {
    itens.push({
      chave: "equipe",
      rotulo: "Quem mais agradou",
      titulo: d.melhor_funcionario.nome,
      detalhe: d.melhor_funcionario.avaliacoes === 1 ? "1 avaliação" : `${d.melhor_funcionario.avaliacoes} avaliações`,
      valor: formatarMedia(d.melhor_funcionario.media),
    });
  }
  return itens;
}

// Até 4 cartões para ler de relance. O que não tem dados suficientes simplesmente não aparece.
export function Destaques({ destaques, className }: { destaques: DadosDestaques; className?: string }) {
  const itens = montarItens(destaques);
  if (itens.length === 0) return null;
  return (
    <section aria-labelledby="titulo-destaques" className={className}>
      <h2 id="titulo-destaques" className="text-xl font-bold">
        Destaques do período
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {itens.map((i) => (
          <li key={i.chave} className="flex items-center gap-4 rounded-2xl bg-creme p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-muted-foreground">{i.rotulo}</p>
              <p className="font-semibold break-words">{i.titulo}</p>
              {i.detalhe && <p className="numeros text-sm text-muted-foreground">{i.detalhe}</p>}
            </div>
            <p className="numeros shrink-0 text-3xl font-bold tracking-tight">{i.valor}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
