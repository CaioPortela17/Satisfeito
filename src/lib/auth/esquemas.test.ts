import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  esquemaCadastro,
  esquemaEntrar,
  esquemaEsqueciSenha,
  esquemaRedefinirSenha,
} from "./esquemas";

// Junta os erros por campo: { email: ["Digite um e-mail válido."], ... }
function errosDos(resultado: {
  success: boolean;
  error?: z.ZodError;
}): Record<string, string[] | undefined> {
  return resultado.error ? z.flattenError(resultado.error).fieldErrors : {};
}

describe("esquemaCadastro", () => {
  it("aceita dados válidos e limpa espaços e maiúsculas do e-mail", () => {
    const r = esquemaCadastro.safeParse({
      nomeEmpresa: "  Bebelu  ",
      email: "  Dono@Bebelu.com.BR ",
      senha: "senhaforte",
      confirmacao: "senhaforte",
    });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({
      nomeEmpresa: "Bebelu",
      email: "dono@bebelu.com.br",
      senha: "senhaforte",
      confirmacao: "senhaforte",
    });
  });

  it("recusa senhas diferentes", () => {
    const r = esquemaCadastro.safeParse({
      nomeEmpresa: "Bebelu",
      email: "a@b.com",
      senha: "senhaforte",
      confirmacao: "senhaforte2",
    });
    expect(errosDos(r).confirmacao?.[0]).toBe("As senhas não são iguais.");
  });

  it("recusa nome vazio, e-mail inválido e senha curta", () => {
    const r = esquemaCadastro.safeParse({ nomeEmpresa: "   ", email: "nao-e-email", senha: "123", confirmacao: "123" });
    expect(r.success).toBe(false);
    const erros = errosDos(r);
    expect(erros.nomeEmpresa?.[0]).toBe("Digite o nome do seu negócio.");
    expect(erros.email?.[0]).toBe("Digite um e-mail válido.");
    expect(erros.senha?.[0]).toBe("A senha precisa ter pelo menos 8 caracteres.");
  });

  it("recusa nome com mais de 100 caracteres e senha com mais de 72", () => {
    const r = esquemaCadastro.safeParse({
      nomeEmpresa: "a".repeat(101),
      email: "a@b.com",
      senha: "x".repeat(73),
      confirmacao: "x".repeat(73),
    });
    const erros = errosDos(r);
    expect(erros.nomeEmpresa?.[0]).toBe("O nome pode ter no máximo 100 caracteres.");
    expect(erros.senha?.[0]).toBe("A senha pode ter no máximo 72 caracteres.");
  });

  it("recusa campos ausentes (ex.: formulário adulterado)", () => {
    const r = esquemaCadastro.safeParse({ nomeEmpresa: null, email: null, senha: null, confirmacao: null });
    expect(r.success).toBe(false);
  });
});

describe("esquemaEntrar", () => {
  it("pede a senha mas não exige tamanho mínimo (contas antigas)", () => {
    const vazio = esquemaEntrar.safeParse({ email: "a@b.com", senha: "" });
    expect(errosDos(vazio).senha?.[0]).toBe("Digite sua senha.");
    expect(esquemaEntrar.safeParse({ email: "a@b.com", senha: "123" }).success).toBe(true);
  });
});

describe("esquemaEsqueciSenha", () => {
  it("valida só o e-mail", () => {
    expect(esquemaEsqueciSenha.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(esquemaEsqueciSenha.safeParse({ email: "x" }).success).toBe(false);
  });
});

describe("esquemaRedefinirSenha", () => {
  it("exige as duas senhas iguais", () => {
    const r = esquemaRedefinirSenha.safeParse({ senha: "senhanova1", confirmacao: "senhanova2" });
    expect(errosDos(r).confirmacao?.[0]).toBe("As senhas não são iguais.");
    expect(
      esquemaRedefinirSenha.safeParse({ senha: "senhanova1", confirmacao: "senhanova1" }).success,
    ).toBe(true);
  });
});
