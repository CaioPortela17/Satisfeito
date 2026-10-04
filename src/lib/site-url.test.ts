import { afterEach, describe, expect, it, vi } from "vitest";
import { urlDoSite } from "./site-url";

describe("urlDoSite", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("monta o endereço completo a partir de NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://satisfeito.com.br");
    expect(urlDoSite("/auth/confirm?next=/painel")).toBe(
      "https://satisfeito.com.br/auth/confirm?next=/painel",
    );
  });

  it("aceita a variável com barra no final", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://satisfeito.com.br/");
    expect(urlDoSite("/painel")).toBe("https://satisfeito.com.br/painel");
  });

  it("usa localhost quando a variável não existe", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(urlDoSite("/painel")).toBe("http://localhost:3000/painel");
  });
});
