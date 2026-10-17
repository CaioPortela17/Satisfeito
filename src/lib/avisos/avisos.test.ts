import { describe, expect, it, vi } from "vitest";
import { emailAtivo, enviarEmail } from "./email";
import { montarAvisoNotaBaixa, montarAvisoRajada, montarEmailRelatorioSemanal } from "./mensagens";
import { ehRespostaRuim, mediaDasNotas } from "./regras";

const EMAIL = { para: "dono@exemplo.com", assunto: "Oi", texto: "Corpo" };
const CONFIG = { chave: "re_chave", remetente: "satisfeito <avisos@exemplo.com>", urlBase: "http://fake" };

describe("enviarEmail", () => {
  it("sem chave ou sem remetente fica desativado e nem chama a rede", async () => {
    const fetchImpl = vi.fn();
    expect(await enviarEmail(EMAIL, { fetchImpl })).toBe("desativado");
    expect(await enviarEmail(EMAIL, { chave: "x", fetchImpl })).toBe("desativado");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(emailAtivo({})).toBe(false);
    expect(emailAtivo(CONFIG)).toBe(true);
  });

  it("manda o pedido certo para a API", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    expect(await enviarEmail(EMAIL, { ...CONFIG, fetchImpl })).toBe("enviado");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://fake/emails");
    expect(init.headers.Authorization).toBe("Bearer re_chave");
    expect(JSON.parse(init.body)).toEqual({ from: CONFIG.remetente, to: ["dono@exemplo.com"], subject: "Oi", text: "Corpo" });
  });

  it("erro da API ou da rede vira 'falhou' e o log não traz o e-mail nem o corpo", async () => {
    const espiao = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await enviarEmail(EMAIL, { ...CONFIG, fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 422 }) })).toBe("falhou");
      expect(await enviarEmail(EMAIL, { ...CONFIG, fetchImpl: vi.fn().mockRejectedValue(new TypeError("dono@exemplo.com")) })).toBe("falhou");
      const logs = espiao.mock.calls.map((c) => String(c[0])).join("\n");
      expect(logs).toContain("422");
      expect(logs).toContain("TypeError");
      expect(logs).not.toContain("dono@exemplo.com");
    } finally {
      espiao.mockRestore();
    }
  });
});

describe("regras", () => {
  it("média das notas do envio, ignorando itens sem nota", () => {
    expect(mediaDasNotas([{ valor_nota: 2 }, { valor_nota: 4 }, { valor_nota: null }, {}])).toBe(3);
    expect(mediaDasNotas([{ valor_nota: null }])).toBeNull();
    expect(mediaDasNotas([])).toBeNull();
  });
  it("resposta ruim = média 4 ou menos (mesma regra das suspeitas)", () => {
    expect(ehRespostaRuim(4)).toBe(true);
    expect(ehRespostaRuim(4.1)).toBe(false);
    expect(ehRespostaRuim(1)).toBe(true);
    expect(ehRespostaRuim(null)).toBe(false);
  });
});

describe("mensagens dos avisos", () => {
  const base = { empresa: "Bebelu\nCentro", pesquisa: "Pesquisa", site: "https://satisfeito.exemplo", pesquisaId: "abc" };
  it("nota baixa: média, link e como parar; sem quebra de linha no assunto", () => {
    const m = montarAvisoNotaBaixa({ ...base, media: 2.5 });
    expect(m.assunto).toBe("Nota baixa na pesquisa Pesquisa (Bebelu Centro)");
    expect(m.texto).toContain("Média das notas dessa resposta: 2,5");
    expect(m.texto).toContain("https://satisfeito.exemplo/painel/respostas?pesquisa=abc");
    expect(m.texto).toContain("Avisos por e-mail");
  });
  it("rajada aponta para a aba de suspeitas", () => {
    expect(montarAvisoRajada(base).texto).toContain("&aba=suspeitas");
  });
  it("relatório semanal leva o texto pronto e o link do período de 7 dias", () => {
    const m = montarEmailRelatorioSemanal({ ...base, relatorio: "*Relatório*\nRespostas: 10" });
    expect(m.texto).toContain("*Relatório*\nRespostas: 10");
    expect(m.texto).toContain("dias=7");
  });
  it("nenhum e-mail usa emojis", () => {
    const todos = [montarAvisoNotaBaixa({ ...base, media: 1 }).texto, montarAvisoRajada(base).texto, montarEmailRelatorioSemanal({ ...base, relatorio: "x" }).texto];
    for (const t of todos) expect(t).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
