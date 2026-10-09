import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ErroConfiguracaoIA } from "./erros";
import { ESQUEMA_FERRAMENTA, NOME_FERRAMENTA } from "./esquema";
import type { ChamarIA } from "./gerar";
import { MODELO_RESUMO } from "./regras";

// Chamada real ao Claude. Só roda no servidor ("server-only" quebra o build se alguém
// importar este arquivo num componente do navegador). A chave vem do .env.local.
// Obrigamos a IA a "chamar a ferramenta" registrar_resumo: assim ela devolve as três
// listas já estruturadas, em vez de um texto livre que teríamos de adivinhar.
export const chamarClaude: ChamarIA = async ({ system, usuario }) => {
  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) throw new ErroConfiguracaoIA();

  const cliente = new Anthropic({ apiKey: chave, timeout: 25_000, maxRetries: 1 });
  const resposta = await cliente.messages.create({
    model: MODELO_RESUMO,
    max_tokens: 2048, // 3 listas x 6 frases x 200 caracteres pode passar de 1024
    system,
    messages: [{ role: "user", content: usuario }],
    tools: [
      {
        name: NOME_FERRAMENTA,
        description: "Registra o resumo dos comentários dos clientes em três listas.",
        input_schema: ESQUEMA_FERRAMENTA,
      },
    ],
    tool_choice: { type: "tool", name: NOME_FERRAMENTA },
  });

  const bloco = resposta.content.find((b) => b.type === "tool_use");
  // Se a resposta foi cortada por falta de espaço, a ferramenta veio incompleta: não confiamos nela
  const cortada = resposta.stop_reason === "max_tokens";
  return {
    entrada: !cortada && bloco && bloco.type === "tool_use" ? bloco.input : null,
    tokensEntrada: resposta.usage.input_tokens,
    tokensSaida: resposta.usage.output_tokens,
  };
};
