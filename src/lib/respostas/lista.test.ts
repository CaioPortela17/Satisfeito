import { describe, expect, it } from "vitest";
import {
  esquemaIdResposta,
  esquemaIdsResposta,
  formatarDataHora,
  lerAba,
  lerPagina,
  mensagemErroDescarte,
} from "./lista";

const ID = "0b9f6a3e-6f6e-4a53-9c1f-2f7d3c9a1b11";

describe("lerAba", () => {
  it("aceita as três abas", () => {
    expect(lerAba("todas")).toBe("todas");
    expect(lerAba("suspeitas")).toBe("suspeitas");
    expect(lerAba("descartadas")).toBe("descartadas");
  });
  it("valor inválido, ausente ou repetido vira todas", () => {
    expect(lerAba("outra")).toBe("todas");
    expect(lerAba(undefined)).toBe("todas");
    expect(lerAba(["suspeitas", "todas"])).toBe("todas");
  });
});

describe("lerPagina", () => {
  it("aceita inteiros a partir de 1", () => {
    expect(lerPagina("1")).toBe(1);
    expect(lerPagina("7")).toBe(7);
  });
  it("o resto vira 1", () => {
    for (const v of ["0", "-3", "abc", "2.5", "", " 2", undefined, ["3", "4"]]) {
      expect(lerPagina(v)).toBe(1);
    }
  });
  it("limita números absurdos", () => {
    expect(lerPagina("99999999999")).toBe(1);
  });
});

describe("formatarDataHora", () => {
  it("usa o fuso de São Paulo", () => {
    expect(formatarDataHora("2026-10-08T17:03:00+00:00")).toBe("08/10/2026 às 14:03");
  });
  it("meia-noite é 00:00, não 24:00", () => {
    expect(formatarDataHora("2026-10-08T03:00:00+00:00")).toBe("08/10/2026 às 00:00");
  });
});

describe("esquemas de id", () => {
  it("aceita uuid e recusa o resto", () => {
    expect(esquemaIdResposta.safeParse(ID).success).toBe(true);
    expect(esquemaIdResposta.safeParse("1").success).toBe(false);
  });
  it("lista de 1 a 20 ids", () => {
    expect(esquemaIdsResposta.safeParse([ID]).success).toBe(true);
    expect(esquemaIdsResposta.safeParse([]).success).toBe(false);
    expect(esquemaIdsResposta.safeParse(Array.from({ length: 21 }, () => ID)).success).toBe(false);
    expect(esquemaIdsResposta.safeParse(["x"]).success).toBe(false);
  });
});

describe("mensagemErroDescarte", () => {
  it("é uma frase amigável", () => {
    expect(mensagemErroDescarte()).toMatch(/tente de novo/i);
  });
});
