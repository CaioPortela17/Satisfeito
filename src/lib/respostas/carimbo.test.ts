import { describe, expect, it } from "vitest";
import { criarCarimbo, verificarCarimbo } from "./carimbo";

const SEGREDO = "segredo-de-teste";
const T0 = 1_760_000_000_000;

describe("carimbo", () => {
  it("ok entre 3 s e 2 h", () => {
    const c = criarCarimbo(T0, SEGREDO);
    expect(verificarCarimbo(c, T0 + 5_000, SEGREDO)).toBe("ok");
    expect(verificarCarimbo(c, T0 + 3_000, SEGREDO)).toBe("ok");
  });
  it("rápido demais", () => {
    expect(verificarCarimbo(criarCarimbo(T0, SEGREDO), T0 + 1_000, SEGREDO)).toBe("rapido");
  });
  it("expirado depois de 2 h", () => {
    expect(verificarCarimbo(criarCarimbo(T0, SEGREDO), T0 + 7_200_001, SEGREDO)).toBe("expirado");
  });
  it("inválido se adulterado, com outro segredo ou lixo", () => {
    const c = criarCarimbo(T0, SEGREDO);
    const [, assinatura] = c.split(".");
    expect(verificarCarimbo(`${T0 - 60_000}.${assinatura}`, T0 + 5_000, SEGREDO)).toBe("invalido");
    expect(verificarCarimbo(c, T0 + 5_000, "outro")).toBe("invalido");
    expect(verificarCarimbo("abc", T0, SEGREDO)).toBe("invalido");
    expect(verificarCarimbo("", T0, SEGREDO)).toBe("invalido");
    expect(verificarCarimbo(`${c}.extra`, T0 + 5_000, SEGREDO)).toBe("invalido");
  });
});
