// O Supabase devolve códigos em inglês (error.code).
// Aqui traduzimos para mensagens claras em português.
const MENSAGENS: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed:
    "Confirme seu e-mail antes de entrar. Procure a mensagem na sua caixa de entrada.",
  weak_password: "Essa senha é fraca demais. Use pelo menos 8 caracteres.",
  same_password: "A nova senha precisa ser diferente da atual.",
  over_email_send_rate_limit: "Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.",
  over_request_rate_limit: "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.",
};

const GENERICA = "Algo deu errado. Tente de novo em instantes.";

export function mensagemDeErro(codigo?: string): string {
  return (codigo && MENSAGENS[codigo]) || GENERICA;
}
