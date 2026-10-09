import { formatarDataHora } from "@/lib/respostas/lista";
import { MINIMO_TEXTOS, type PodeGerar } from "@/lib/resumo/regras";
import type { UsoResumos } from "@/lib/resumo/tipos";
import { BotaoResumo } from "./botao-resumo";

const AVISO_PRIVACIDADE = "O texto das respostas é enviado a um serviço de IA para gerar o resumo.";

// Seção "O que os clientes escreveram": resumo por IA das respostas de texto.
// Tudo que vem da IA ou dos clientes entra só como texto puro do React (nunca como HTML).
export function ResumoIa({
  pesquisaId,
  uso,
  bloqueio,
  className,
}: {
  pesquisaId: string;
  uso: UsoResumos | null;
  bloqueio: PodeGerar;
  className?: string;
}) {
  const titulo = (
    <h2 id="titulo-resumo" className="text-xl font-bold">
      O que os clientes escreveram
    </h2>
  );

  // A consulta falhou: sem botão, porque não sabemos se pode gerar
  if (!uso) {
    return (
      <section aria-labelledby="titulo-resumo" className={className}>
        {titulo}
        <p className="mt-3 text-muted-foreground">Não deu para carregar o resumo agora.</p>
      </section>
    );
  }

  const resumo = uso.ultimo;

  // Motivo de o botão estar desativado (intervalo entre resumos ou teto do dia)
  const desativadoRotulo = bloqueio.ok
    ? undefined
    : bloqueio.motivo === "intervalo"
      ? `Disponível de novo em ${bloqueio.minutos} min`
      : "Limite de hoje atingido";

  // Sem resumo salvo e com poucos textos: nada para mostrar nem para pedir
  if (!resumo && uso.textos < MINIMO_TEXTOS) {
    return (
      <section aria-labelledby="titulo-resumo" className={className}>
        {titulo}
        <p className="mt-3 text-muted-foreground">
          Ainda há poucas respostas escritas para resumir. Quando chegarem mais comentários, o resumo aparece aqui.
        </p>
      </section>
    );
  }

  // Ainda não tem resumo, mas já há textos suficientes
  if (!resumo) {
    return (
      <section aria-labelledby="titulo-resumo" className={className}>
        {titulo}
        <p className="mt-1 text-sm text-muted-foreground">
          Um resumo dos elogios, das reclamações e das sugestões que os clientes deixaram por escrito.
        </p>
        <div className="mt-4">
          <BotaoResumo pesquisaId={pesquisaId} temResumo={false} desativadoRotulo={desativadoRotulo} />
          <p className="mt-2 text-xs text-muted-foreground">{AVISO_PRIVACIDADE}</p>
        </div>
      </section>
    );
  }

  const blocos = [
    { titulo: "Elogios", itens: resumo.conteudo.positivos },
    { titulo: "Reclamações", itens: resumo.conteudo.reclamacoes },
    { titulo: "Sugestões", itens: resumo.conteudo.sugestoes },
  ];
  const n = resumo.respostas_lidas;
  // Com menos de 3 textos hoje (ex.: respostas descartadas) mostramos o resumo, mas não pedimos outro
  const podePedirOutro = uso.textos >= MINIMO_TEXTOS;

  return (
    <section aria-labelledby="titulo-resumo" className={className}>
      {titulo}
      <div className="mt-4 space-y-3">
        {blocos.map((bloco) => (
          <div key={bloco.titulo} className="rounded-2xl bg-creme p-4">
            <h3 className="font-semibold">{bloco.titulo}</h3>
            {bloco.itens.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">Nada a destacar</p>
            ) : (
              <ul className="mt-2 list-disc space-y-1.5 pl-5 marker:text-ameixa">
                {bloco.itens.map((item, i) => (
                  <li key={i} className="break-words">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <p className="numeros mt-4 text-sm text-muted-foreground">
        Gerado em {formatarDataHora(resumo.created_at)}, com base em{" "}
        {n === 1 ? "1 resposta escrita" : `${n} respostas escritas`}
      </p>
      {podePedirOutro && (
        <div className="mt-3">
          <BotaoResumo pesquisaId={pesquisaId} temResumo desativadoRotulo={desativadoRotulo} />
          <p className="mt-2 text-xs text-muted-foreground">{AVISO_PRIVACIDADE}</p>
        </div>
      )}
    </section>
  );
}
