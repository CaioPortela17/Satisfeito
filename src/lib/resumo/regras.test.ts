import { describe, expect, it } from "vitest";
import { INTERVALO_MINUTOS, MAX_CARACTERES_TEXTO, MAX_TEXTOS, MINIMO_TEXTOS, MODELO_RESUMO, TETO_DIARIO, podeGerar } from "./regras";
import type { ResumoSalvo } from "./tipos";

const AGORA = new Date("2026-10-08T15:00:00.000Z");
function ultimoHa(minutos: number): ResumoSalvo {
  return {
    id: "u",
    conteudo: { positivos: [], reclamacoes: [], sugestoes: [] },
    respostas_lidas: 5,
    modelo: MODELO_RESUMO,
    created_at: new Date(AGORA.getTime() - minutos * 60_000).toISOString(),
  };
}

describe("constantes", () => {
  it("têm os valores combinados", () => {
    expect(MODELO_RESUMO).toBe("claude-haiku-5-5");
    expect(INTERVALO_MINUTOS).toBe(10);
    expect(TETO_DIARIO).toBe(20);
    expect(MINIMO_TEXTOS).toBe(3);
    expect(MAX_TEXTOS).toBe(200);
    expect(MAX_CARACTERES_TEXTO).toBe(1000);
  });
});

describe("podeGerar", () => {
  it("libera quando nunca gerou", () => {
    expect(podeGerar({ ultimo: null, hoje: 0 }, AGORA)).toEqual({ ok: true });
  });
  it("bloqueia com 9 minutos e diz quanto falta (arredondando para cima)", () => {
    expect(podeGerar({ ultimo: ultimoHa(9), hoje: 1 }, AGORA)).toEqual({ ok: false, motivo: "intervalo", minutos: 1 });
    expect(podeGerar({ ultimo: ultimoHa(0.5), hoje: 1 }, AGORA)).toEqual({ ok: false, motivo: "intervalo", minutos: 10 });
  });
  it("relógio do banco adiantado (created_at no futuro) mostra no máximo 10 minutos", () => {
    expect(podeGerar({ ultimo: ultimoHa(-0.05), hoje: 1 }, AGORA)).toEqual({ ok: false, motivo: "intervalo", minutos: 10 });
  });
  it("libera com exatamente 10 minutos", () => {
    expect(podeGerar({ ultimo: ultimoHa(10), hoje: 1 }, AGORA)).toEqual({ ok: true });
  });
  it("teto: 19 libera, 20 bloqueia", () => {
    expect(podeGerar({ ultimo: ultimoHa(60), hoje: 19 }, AGORA)).toEqual({ ok: true });
    expect(podeGerar({ ultimo: ultimoHa(60), hoje: 20 }, AGORA)).toEqual({ ok: false, motivo: "teto" });
  });
  it("o teto vence o intervalo", () => {
    expect(podeGerar({ ultimo: ultimoHa(1), hoje: 20 }, AGORA)).toEqual({ ok: false, motivo: "teto" });
  });
});
