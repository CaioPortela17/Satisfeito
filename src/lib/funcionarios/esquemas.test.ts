import { describe, expect, it } from "vitest";
import {
  esquemaIdFuncionario,
  esquemaNomeFuncionario,
  mensagemErroFuncionario,
} from "./esquemas";

describe("esquemaNomeFuncionario", () => {
  it("aceita e limpa espaços das pontas", () => {
    expect(esquemaNomeFuncionario.parse("  Ana Paula  ")).toBe("Ana Paula");
  });

  it("recusa vazio ou só espaços", () => {
    const r = esquemaNomeFuncionario.safeParse("   ");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("Digite o nome do funcionário.");
  });

  it("aceita 60 caracteres e recusa 61", () => {
    expect(esquemaNomeFuncionario.safeParse("a".repeat(60)).success).toBe(true);
    const r = esquemaNomeFuncionario.safeParse("a".repeat(61));
    expect(r.error?.issues[0].message).toBe("O nome pode ter no máximo 60 caracteres.");
  });

  it("recusa valor que não é texto", () => {
    expect(esquemaNomeFuncionario.safeParse(null).success).toBe(false);
  });
});

describe("esquemaIdFuncionario", () => {
  it("aceita uuid e recusa outras coisas", () => {
    expect(esquemaIdFuncionario.safeParse("3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b").success).toBe(true);
    expect(esquemaIdFuncionario.safeParse("1 or 1=1").success).toBe(false);
  });
});

describe("mensagemErroFuncionario", () => {
  it("traduz nome repetido (23505)", () => {
    expect(mensagemErroFuncionario("23505")).toBe(
      "Já existe um funcionário com esse nome. Diferencie, por exemplo: Ana Paula ou Ana C.",
    );
  });

  it("usa mensagem genérica nos outros casos", () => {
    expect(mensagemErroFuncionario("42501")).toBe("Algo deu errado. Tente de novo em instantes.");
    expect(mensagemErroFuncionario()).toBe("Algo deu errado. Tente de novo em instantes.");
  });
});
