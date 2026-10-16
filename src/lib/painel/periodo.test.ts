import { describe, expect, it } from "vitest";
import { DIAS_VALIDOS, PERIODO_PADRAO, lerDias } from "./periodo";

describe("lerDias", () => {
  it("aceita 7, 30 e 90", () => {
    expect(lerDias("7")).toBe(7);
    expect(lerDias("30")).toBe(30);
    expect(lerDias("90")).toBe(90);
  });
  it("sem valor ou com valor inválido cai para 30", () => {
    expect(lerDias(undefined)).toBe(30);
    expect(lerDias("")).toBe(30);
    expect(lerDias("15")).toBe(30);
    expect(lerDias("abc")).toBe(30);
    expect(lerDias("7.5")).toBe(30);
    expect(lerDias("-7")).toBe(30);
  });
  it("tem as constantes combinadas", () => {
    expect(DIAS_VALIDOS).toEqual([7, 30, 90]);
    expect(PERIODO_PADRAO).toBe(30);
  });
});
