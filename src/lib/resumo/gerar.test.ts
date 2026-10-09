import { describe, expect, it, vi } from "vitest";
import { ErroConfiguracaoIA } from "./erros";
import { gerarResumo } from "./gerar";

const TEXTOS = [{ pergunta: "P", texto: "Gostei" }];
const BOM = { positivos: ["Gostaram"], reclamacoes: [], sugestoes: [] };

describe("gerarResumo", () => {
  it("devolve o resumo limpo e os tokens", async () => {
    const chamar = vi.fn().mockResolvedValue({ entrada: BOM, tokensEntrada: 100, tokensSaida: 20 });
    const r = await gerarResumo(TEXTOS, chamar);
    expect(r).toEqual({ ok: true, resumo: BOM, tokensEntrada: 100, tokensSaida: 20 });
    expect(chamar).toHaveBeenCalledTimes(1);
    expect(chamar.mock.calls[0][0].usuario).toContain("Gostei");
  });
  it("saída fora do formato vira 'formato'", async () => {
    const r = await gerarResumo(TEXTOS, async () => ({ entrada: { positivos: "x" } }));
    expect(r).toEqual({ ok: false, motivo: "formato" });
  });
  it("falha da IA ou da rede vira 'ia' (sem vazar o erro)", async () => {
    const r = await gerarResumo(TEXTOS, async () => {
      throw new Error("segredo técnico 401");
    });
    expect(r).toEqual({ ok: false, motivo: "ia" });
  });
  it("chave faltando vira 'configuracao'", async () => {
    const r = await gerarResumo(TEXTOS, async () => {
      throw new ErroConfiguracaoIA();
    });
    expect(r).toEqual({ ok: false, motivo: "configuracao" });
  });
});
