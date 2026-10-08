import type { Resultados } from "@/lib/resultados/tipos";

const ITENS = [
  { chave: "hoje", rotulo: "Hoje" },
  { chave: "sete_dias", rotulo: "Últimos 7 dias" },
  { chave: "trinta_dias", rotulo: "Últimos 30 dias" },
] as const;

// Três cartões com o total de respostas. O texto escondido (sr-only) faz o leitor
// de tela ler "Hoje: 3 respostas" em vez de "Hoje" e "3" soltos.
export function CartoesTotais({ totais }: { totais: Resultados["totais"] }) {
  return (
    <ul className="grid grid-cols-3 gap-3">
      {ITENS.map(({ chave, rotulo }) => (
        <li key={chave} className="rounded-3xl bg-card p-4 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-5">
          <p className="numeros text-3xl font-bold tracking-tight sm:text-4xl">{totais[chave]}</p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {rotulo}
            <span className="sr-only">: {totais[chave] === 1 ? "1 resposta" : `${totais[chave]} respostas`}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
