import { describe, expect, it, vi } from "vitest";
import { verificarTurnstile } from "./turnstile";

function resposta(corpo: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(corpo), { status }));
}

describe("verificarTurnstile", () => {
  it("token vazio ou grande demais é inválido, sem chamar a rede", async () => {
    const buscar = vi.fn();
    expect(await verificarTurnstile("", "segredo", buscar)).toBe("invalido");
    expect(await verificarTurnstile("a".repeat(2049), "segredo", buscar)).toBe("invalido");
    expect(buscar).not.toHaveBeenCalled();
  });

  it("success true → ok", async () => {
    const buscar = vi.fn(() => resposta({ success: true }));
    expect(await verificarTurnstile("token", "segredo", buscar)).toBe("ok");
  });

  it("success false → inválido", async () => {
    const buscar = vi.fn(() => resposta({ success: false, "error-codes": ["invalid-input-response"] }));
    expect(await verificarTurnstile("token", "segredo", buscar)).toBe("invalido");
  });

  it("erro interno da Cloudflare → indisponível", async () => {
    const buscar = vi.fn(() => resposta({ success: false, "error-codes": ["internal-error"] }));
    expect(await verificarTurnstile("token", "segredo", buscar)).toBe("indisponivel");
  });

  it("rede caída, tempo esgotado, status 500 ou JSON estranho → indisponível", async () => {
    expect(await verificarTurnstile("t", "s", vi.fn(() => Promise.reject(new Error("rede"))))).toBe("indisponivel");
    expect(await verificarTurnstile("t", "s", vi.fn(() => resposta({}, 500)))).toBe("indisponivel");
    expect(await verificarTurnstile("t", "s", vi.fn(() => resposta({ outra: 1 })))).toBe("indisponivel");
    expect(await verificarTurnstile("t", "s", vi.fn(() => Promise.resolve(new Response("não é json"))))).toBe("indisponivel");
  });

  it("envia secret e response, e nunca o IP (remoteip)", async () => {
    const buscar = vi.fn((_url: string | URL | Request, _init?: RequestInit) => resposta({ success: true }));
    await verificarTurnstile("meu-token", "meu-segredo", buscar);
    const [url, init] = buscar.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(init?.method).toBe("POST");
    const corpo = new URLSearchParams(String(init?.body));
    expect(corpo.get("secret")).toBe("meu-segredo");
    expect(corpo.get("response")).toBe("meu-token");
    expect(corpo.has("remoteip")).toBe(false);
  });
});
