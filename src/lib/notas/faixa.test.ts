import { describe, expect, it } from "vitest";
import { faixaDaNota } from "./faixa";

describe("faixaDaNota", () => {
  it("8 a 10 é boa", () => {
    expect(faixaDaNota(10)).toBe("boa");
    expect(faixaDaNota(8)).toBe("boa");
  });

  it("6 até menos de 8 é atenção", () => {
    expect(faixaDaNota(7.99)).toBe("atencao");
    expect(faixaDaNota(6)).toBe("atencao");
  });

  it("abaixo de 6 é ruim", () => {
    expect(faixaDaNota(5.99)).toBe("ruim");
    expect(faixaDaNota(1)).toBe("ruim");
  });
});
