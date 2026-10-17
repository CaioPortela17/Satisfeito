// Envio de e-mail pela API do Resend (https://resend.com), só com fetch: nenhuma biblioteca nova.
// Sem RESEND_API_KEY e EMAIL_REMETENTE o envio fica DESLIGADO e nada quebra: os avisos simplesmente não saem.

export type Email = { para: string; assunto: string; texto: string };
export type ResultadoEmail = "enviado" | "desativado" | "falhou";

export type ConfigEmail = {
  chave?: string;
  remetente?: string; // ex.: "satisfeito <avisos@seudominio.com.br>" (o domínio precisa estar verificado no Resend)
  urlBase?: string; // só muda nos testes, para apontar para um servidor falso
  fetchImpl?: typeof fetch;
};

const URL_PADRAO = "https://api.resend.com";
const TEMPO_LIMITE_MS = 8000;

function configDoAmbiente(): ConfigEmail {
  return {
    chave: process.env.RESEND_API_KEY,
    remetente: process.env.EMAIL_REMETENTE,
    urlBase: process.env.RESEND_API_URL,
  };
}

export function emailAtivo(config: ConfigEmail = configDoAmbiente()): boolean {
  return Boolean(config.chave && config.remetente);
}

export async function enviarEmail(email: Email, config: ConfigEmail = configDoAmbiente()): Promise<ResultadoEmail> {
  if (!config.chave || !config.remetente) return "desativado";
  const buscar = config.fetchImpl ?? fetch;
  try {
    const resposta = await buscar(`${config.urlBase ?? URL_PADRAO}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.remetente, to: [email.para], subject: email.assunto, text: email.texto }),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
    if (!resposta.ok) {
      // Só o status vai para o log: nunca o corpo da resposta nem o e-mail do dono
      console.error(`aviso por e-mail falhou: HTTP ${resposta.status}`);
      return "falhou";
    }
    return "enviado";
  } catch (e) {
    console.error(`aviso por e-mail falhou: ${e instanceof Error ? e.constructor.name : "ErroDesconhecido"}`);
    return "falhou";
  }
}
