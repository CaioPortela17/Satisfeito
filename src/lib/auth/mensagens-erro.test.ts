import { describe, expect, it } from "vitest";
import { mensagemDeErro } from "./mensagens-erro";

describe("mensagemDeErro", () => {
  it("traduz códigos conhecidos do Supabase", () => {
    expect(mensagemDeErro("invalid_credentials")).toBe("E-mail ou senha incorretos.");
    expect(mensagemDeErro("email_not_confirmed")).toBe(
      "Confirme seu e-mail antes de entrar. Procure a mensagem na sua caixa de entrada.",
    );
    expect(mensagemDeErro("over_email_send_rate_limit")).toBe(
      "Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.",
    );
  });

  it("usa uma mensagem genérica para códigos desconhecidos ou ausentes", () => {
    const generica = "Algo deu errado. Tente de novo em instantes.";
    expect(mensagemDeErro("codigo_que_nao_existe")).toBe(generica);
    expect(mensagemDeErro(undefined)).toBe(generica);
  });
});
