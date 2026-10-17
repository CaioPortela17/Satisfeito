import { formatarMedia } from "@/lib/resultados/apresentacao";
import type { Email } from "./email";

// Textos dos e-mails. Texto simples, sem emojis. Nunca levam o que o cliente escreveu (só a nota e o link),
// porque e-mail passa por vários servidores e fica guardado.
type Dados = { empresa: string; pesquisa: string; site: string; pesquisaId: string };

function sem(texto: string): string {
  return texto.replace(/[\r\n]+/g, " ").trim();
}

const RODAPE = (site: string) =>
  `\nPara parar de receber estes avisos, desligue em Início > Avisos por e-mail: ${site}/painel`;

export function montarAvisoNotaBaixa(d: Dados & { media: number }): Pick<Email, "assunto" | "texto"> {
  const link = `${d.site}/painel/respostas?pesquisa=${d.pesquisaId}`;
  return {
    assunto: `Nota baixa na pesquisa ${sem(d.pesquisa)} (${sem(d.empresa)})`,
    texto: [
      `Chegou uma resposta com nota baixa na pesquisa "${sem(d.pesquisa)}" da empresa ${sem(d.empresa)}.`,
      "",
      `Média das notas dessa resposta: ${formatarMedia(Math.round(d.media * 10) / 10)}`,
      "",
      `Veja a resposta e decida o que fazer: ${link}`,
      "",
      "Para não encher a sua caixa de entrada, mandamos no máximo um aviso destes a cada 30 minutos por pesquisa.",
      RODAPE(d.site),
    ].join("\n"),
  };
}

export function montarAvisoRajada(d: Dados): Pick<Email, "assunto" | "texto"> {
  const link = `${d.site}/painel/respostas?pesquisa=${d.pesquisaId}&aba=suspeitas`;
  return {
    assunto: `Várias notas ruins seguidas em ${sem(d.pesquisa)} (${sem(d.empresa)})`,
    texto: [
      `Notamos várias notas ruins em poucos minutos na pesquisa "${sem(d.pesquisa)}" da empresa ${sem(d.empresa)}.`,
      "",
      "Pode ser um problema real no atendimento ou alguém tentando prejudicar a sua nota. Só você consegue saber.",
      `Veja as respostas marcadas como suspeitas e descarte as que não valem: ${link}`,
      RODAPE(d.site),
    ].join("\n"),
  };
}

export function montarEmailRelatorioSemanal(d: Dados & { relatorio: string }): Pick<Email, "assunto" | "texto"> {
  return {
    assunto: `Relatório da semana: ${sem(d.pesquisa)} (${sem(d.empresa)})`,
    texto: [
      "Aqui está o relatório da semana, pronto para você copiar e mandar para a equipe:",
      "",
      "----------------------------------------",
      d.relatorio,
      "----------------------------------------",
      "",
      `Veja os números completos no painel: ${d.site}/painel/resultados?pesquisa=${d.pesquisaId}&dias=7`,
      RODAPE(d.site),
    ].join("\n"),
  };
}
