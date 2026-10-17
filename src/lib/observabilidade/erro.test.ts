import { describe, expect, it } from "vitest";
import { resumoDoErro } from "./erro";

const PEDIDO = { path: "/auth/confirm?code=segredo123&next=/painel", method: "GET" };
const CONTEXTO = { routePath: "/auth/confirm", routeType: "route" };

describe("resumoDoErro", () => {
  it("não guarda parâmetros da URL (podem ter códigos)", () => {
    const r = resumoDoErro(new Error("falhou"), PEDIDO, CONTEXTO);
    expect(r.caminho).toBe("/auth/confirm");
    expect(JSON.stringify(r)).not.toContain("segredo123");
  });
  it("guarda tipo, mensagem, digest, método e rota", () => {
    const erro = Object.assign(new TypeError("quebrou aqui"), { digest: "abc123" });
    expect(resumoDoErro(erro, PEDIDO, CONTEXTO)).toEqual({
      evento: "erro_no_servidor",
      tipo: "TypeError",
      mensagem: "quebrou aqui",
      digest: "abc123",
      metodo: "GET",
      caminho: "/auth/confirm",
      rota: "/auth/confirm",
      contexto: "route",
    });
  });
  it("corta mensagens muito longas", () => {
    expect(resumoDoErro(new Error("x".repeat(500)), PEDIDO, CONTEXTO).mensagem).toHaveLength(200);
  });
  it("aceita erro que não é um Error", () => {
    expect(resumoDoErro("texto solto", PEDIDO, CONTEXTO)).toMatchObject({ tipo: "Erro", mensagem: "texto solto" });
    expect(resumoDoErro(null, PEDIDO, CONTEXTO)).toMatchObject({ tipo: "Erro", mensagem: "null" });
  });
});
