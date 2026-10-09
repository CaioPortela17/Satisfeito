import { describe, expect, it } from "vitest";
import { mensagemResumo } from "./mensagens";

describe("mensagemResumo", () => {
  it("cada motivo tem uma frase amigável", () => {
    expect(mensagemResumo("geral")).toMatch(/tente de novo/i);
    expect(mensagemResumo("ia")).toMatch(/tente de novo/i);
    expect(mensagemResumo("formato")).toMatch(/tente de novo/i);
    expect(mensagemResumo("configuracao")).toMatch(/ainda não está configurado/i);
    expect(mensagemResumo("teto")).toMatch(/amanhã/i);
    expect(mensagemResumo("poucas")).toMatch(/poucas respostas escritas/i);
  });
  it("o intervalo diz quantos minutos faltam", () => {
    expect(mensagemResumo("intervalo", 7)).toContain("7 min");
    expect(mensagemResumo("intervalo")).toMatch(/há pouco/i);
  });
  it("nenhuma mensagem é técnica", () => {
    for (const m of ["geral", "ia", "formato", "configuracao", "teto", "poucas", "intervalo"] as const) {
      expect(mensagemResumo(m, 1)).not.toMatch(/api|token|anthropic|erro \d|exception/i);
    }
  });
});
