import { describe, expect, it, vi } from "vitest";
import { ErroConfiguracaoIA } from "./erros";
import { NUMEROS_EXEMPLO, RESUMO_EXEMPLO } from "./exemplo-numeros";
import { gerarResumo } from "./gerar";

const TEXTOS = [{ pergunta: "P", texto: "Gostei" }];
const BOM = RESUMO_EXEMPLO;

describe("gerarResumo", () => {
  it("devolve o relatório limpo e os tokens", async () => {
    const chamar = vi.fn().mockResolvedValue({ entrada: BOM, tokensEntrada: 100, tokensSaida: 20 });
    const r = await gerarResumo(TEXTOS, chamar, NUMEROS_EXEMPLO);
    expect(r).toEqual({ ok: true, resumo: BOM, tokensEntrada: 100, tokensSaida: 20 });
    expect(chamar).toHaveBeenCalledTimes(1);
    expect(chamar.mock.calls[0][0].usuario).toContain("Gostei");
    expect(chamar.mock.calls[0][0].usuario).toContain("<numeros>");
  });
  it("saída fora do formato vira 'formato'", async () => {
    const r = await gerarResumo(TEXTOS, async () => ({ entrada: { positivos: "x" } }), NUMEROS_EXEMPLO);
    expect(r).toEqual({ ok: false, motivo: "formato" });
  });
  it("sem panorama ou sem ações é formato inválido", async () => {
    const { panorama: _p, ...semPanorama } = BOM;
    void _p;
    const { acoes: _a, ...semAcoes } = BOM;
    void _a;
    expect(await gerarResumo(TEXTOS, async () => ({ entrada: semPanorama }), NUMEROS_EXEMPLO)).toEqual({ ok: false, motivo: "formato" });
    expect(await gerarResumo(TEXTOS, async () => ({ entrada: semAcoes }), NUMEROS_EXEMPLO)).toEqual({ ok: false, motivo: "formato" });
  });
  it("número inventado no panorama: tenta de novo e aceita a segunda resposta, somando os tokens", async () => {
    const inventado = { ...BOM, panorama: "A nota média subiu para 9,7 neste período." };
    const chamar = vi
      .fn()
      .mockResolvedValueOnce({ entrada: inventado, tokensEntrada: 100, tokensSaida: 20 })
      .mockResolvedValueOnce({ entrada: BOM, tokensEntrada: 110, tokensSaida: 25 });
    const r = await gerarResumo(TEXTOS, chamar, NUMEROS_EXEMPLO);
    expect(r).toEqual({ ok: true, resumo: BOM, tokensEntrada: 210, tokensSaida: 45 });
    expect(chamar).toHaveBeenCalledTimes(2);
  });
  it("número inventado nas duas tentativas vira 'formato'", async () => {
    const inventado = { ...BOM, acoes: ["Chegar a 25% de promotores"] };
    const chamar = vi.fn().mockResolvedValue({ entrada: inventado });
    const r = await gerarResumo(TEXTOS, chamar, NUMEROS_EXEMPLO);
    expect(r).toEqual({ ok: false, motivo: "formato" });
    expect(chamar).toHaveBeenCalledTimes(2);
  });
  it("falha da IA ou da rede vira 'ia' (sem vazar o erro)", async () => {
    const r = await gerarResumo(
      TEXTOS,
      async () => {
        throw new Error("segredo técnico 401");
      },
      NUMEROS_EXEMPLO,
    );
    expect(r).toEqual({ ok: false, motivo: "ia" });
  });
  it("registra só a classe e o status do erro, nunca a mensagem", async () => {
    const espiao = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      class ErroApi extends Error {
        status = 401;
      }
      await gerarResumo(
        TEXTOS,
        async () => {
          throw new ErroApi("segredo técnico 401");
        },
        NUMEROS_EXEMPLO,
      );
      expect(espiao).toHaveBeenCalledTimes(1);
      const log = String(espiao.mock.calls[0][0]);
      expect(log).toContain("ErroApi");
      expect(log).toContain("401");
      expect(log).not.toContain("segredo técnico 401");
    } finally {
      espiao.mockRestore();
    }
  });
  it("chave faltando vira 'configuracao'", async () => {
    const r = await gerarResumo(
      TEXTOS,
      async () => {
        throw new ErroConfiguracaoIA();
      },
      NUMEROS_EXEMPLO,
    );
    expect(r).toEqual({ ok: false, motivo: "configuracao" });
  });
});
