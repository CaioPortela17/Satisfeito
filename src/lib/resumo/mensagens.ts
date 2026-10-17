export type MotivoErro = "geral" | "configuracao" | "poucas" | "teto" | "intervalo" | "ia" | "formato";

// Frases que o dono vê. Nada técnico: o motivo real não vai para a tela.
export function mensagemResumo(motivo: MotivoErro, minutos?: number): string {
  switch (motivo) {
    case "configuracao":
      return "O resumo por IA ainda não está configurado.";
    case "poucas":
      return "Ainda há poucas respostas neste período para montar o relatório.";
    case "teto":
      return "Você já gerou muitos resumos hoje. Tente amanhã.";
    case "intervalo":
      return minutos
        ? `Você gerou um resumo há pouco. Tente de novo em ${minutos} min.`
        : "Você gerou um resumo há pouco. Tente de novo em instantes.";
    default:
      return "Não deu para gerar o resumo agora. Tente de novo em instantes.";
  }
}
