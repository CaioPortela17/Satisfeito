import type { Periodo } from "@/lib/painel/tipos";
import { formatarDataHora } from "@/lib/respostas/lista";
import { montarRelatorioWhatsApp } from "@/lib/resumo/relatorio";
import { MINIMO_ENVIOS_RELATORIO, type PodeGerar } from "@/lib/resumo/regras";
import type { Resumo, UsoResumos } from "@/lib/resumo/tipos";
import { BotaoCopiar } from "./botao-copiar";
import { BotaoResumo } from "./botao-resumo";

const AVISO_PRIVACIDADE =
  "Os números do período e o texto das respostas são enviados a um serviço de IA para escrever o relatório. Nomes de funcionários só vão se você ligar a opção acima.";

// Resumos antigos (antes do relatório) têm só as três listas
function ListasAntigas({ conteudo }: { conteudo: Resumo }) {
  const blocos = [
    { titulo: "Elogios", itens: conteudo.positivos },
    { titulo: "Reclamações", itens: conteudo.reclamacoes },
    { titulo: "Sugestões", itens: conteudo.sugestoes },
  ];
  return (
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
  );
}

// Seção "Relatório para a equipe": um texto pronto para copiar e mandar no WhatsApp.
// Tudo que vem da IA ou dos clientes entra só como texto puro do React (nunca como HTML).
export function ResumoIa({
  pesquisaId,
  uso,
  bloqueio,
  dias,
  enviosNoPeriodo,
  className,
}: {
  pesquisaId: string;
  uso: UsoResumos | null;
  bloqueio: PodeGerar;
  dias: Periodo;
  enviosNoPeriodo: number;
  className?: string;
}) {
  const titulo = (
    <h2 id="titulo-resumo" className="text-xl font-bold">
      Relatório para a equipe
    </h2>
  );

  // A consulta falhou: sem botão, porque não sabemos se pode gerar
  if (!uso) {
    return (
      <section aria-labelledby="titulo-resumo" className={className}>
        {titulo}
        <p className="mt-3 text-muted-foreground">Não deu para carregar o relatório agora.</p>
      </section>
    );
  }

  const resumo = uso.ultimo;
  const temPoucos = enviosNoPeriodo < MINIMO_ENVIOS_RELATORIO;

  // Motivo de o botão estar desativado (intervalo entre relatórios ou teto do dia)
  const motivoDesativado = bloqueio.ok
    ? undefined
    : bloqueio.motivo === "intervalo"
      ? `Disponível de novo em ${bloqueio.minutos} min`
      : "Limite de hoje atingido";

  // Sem relatório salvo e com poucas respostas no período: nada para mostrar nem para pedir
  if (!resumo && temPoucos) {
    return (
      <section aria-labelledby="titulo-resumo" className={className}>
        {titulo}
        <p className="mt-3 text-muted-foreground">
          Ainda há poucas respostas nos últimos {dias} dias (o relatório precisa de {MINIMO_ENVIOS_RELATORIO} ou mais). Escolha um período maior ou espere
          chegarem mais respostas.
        </p>
      </section>
    );
  }

  // O texto de WhatsApp sai do retrato de números guardado junto do relatório. Resumos antigos não têm.
  const conteudo = resumo?.conteudo;
  const relatorio =
    resumo && resumo.numeros && conteudo?.panorama ? montarRelatorioWhatsApp(resumo.numeros, conteudo) : null;

  // Os casos (sem relatório / com relatório / resumo antigo) usam o MESMO esqueleto: título, conteúdo e rodapé.
  // O botão fica sempre no rodapé, na mesma posição da árvore. Assim o React não o recria
  // quando o relatório aparece, e o aviso "Relatório gerado." para o leitor de tela não se perde.
  // Com poucas respostas no período, mostramos o relatório salvo, mas não pedimos outro.
  const mostrarBotao = !temPoucos;

  return (
    <section aria-labelledby="titulo-resumo" className={className}>
      {titulo}
      <div>
        {relatorio && resumo ? (
          <>
            <p className="numeros mt-1 text-sm text-muted-foreground">
              Gerado em {formatarDataHora(resumo.created_at)}, com os últimos {resumo.dias} dias
              {resumo.com_nomes ? ", citando a equipe" : ""}. Confira antes de enviar.
            </p>
            {/* Texto puro: whitespace-pre-wrap preserva as quebras de linha do WhatsApp */}
            <div
              tabIndex={0}
              role="region"
              aria-label="Texto do relatório"
              className="mt-3 rounded-2xl bg-creme p-4 text-[0.95rem] leading-relaxed break-words whitespace-pre-wrap focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {relatorio}
            </div>
            <div className="mt-3">
              <BotaoCopiar texto={relatorio} />
            </div>
          </>
        ) : resumo ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Este resumo é da versão antiga (só os comentários). Gere um relatório novo para ter o texto completo para a equipe.
            </p>
            <ListasAntigas conteudo={resumo.conteudo} />
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Um texto pronto para você copiar e mandar no WhatsApp da equipe: como foi o período, o que os clientes elogiaram,
            reclamaram e sugeriram, e o que fazer a seguir.
          </p>
        )}
      </div>
      {mostrarBotao && (
        <div className="mt-6 border-t border-border pt-4">
          <BotaoResumo pesquisaId={pesquisaId} dias={dias} temResumo={Boolean(resumo)} motivoDesativado={motivoDesativado} />
          <p className="mt-3 text-xs text-muted-foreground">{AVISO_PRIVACIDADE}</p>
        </div>
      )}
    </section>
  );
}
