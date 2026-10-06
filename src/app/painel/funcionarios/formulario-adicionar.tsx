"use client";

import { useActionState, useEffect, useRef } from "react";
import { ErroDoCampo } from "@/components/formulario/erro-do-campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adicionarFuncionario, type EstadoAcao } from "./actions";

const estadoInicial: EstadoAcao = {};

export function FormularioAdicionar() {
  const [estado, acao, pendente] = useActionState(adicionarFuncionario, estadoInicial);
  const campo = useRef<HTMLInputElement>(null);

  // Depois de adicionar, o campo (já limpo pelo React) continua focado:
  // dá para cadastrar a equipe inteira em sequência, só digitando e apertando Enter
  useEffect(() => {
    if (estado.ok) campo.current?.focus();
  }, [estado.ok]);

  return (
    <form action={acao} className="space-y-2" noValidate>
      <Label htmlFor="novo-funcionario">Adicionar funcionário</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          ref={campo}
          id="novo-funcionario"
          name="nome"
          placeholder="Ex.: Ana Paula"
          autoComplete="off"
          maxLength={60}
          defaultValue={estado.valor}
          aria-invalid={Boolean(estado.erro)}
          aria-describedby={estado.erro ? "erro-adicionar" : undefined}
        />
        <Button type="submit" disabled={pendente} className="sm:w-32">
          {pendente ? "Adicionando…" : "Adicionar"}
        </Button>
      </div>
      {/* role="alert": o leitor de tela lê o erro assim que ele aparece */}
      <div role="alert">
        <ErroDoCampo id="erro-adicionar" erros={estado.erro ? [estado.erro] : undefined} />
      </div>
      {/* Invisível na tela; só avisa o leitor de tela que deu certo */}
      <p role="status" className="sr-only">
        {estado.adicionado ? `${estado.adicionado} entrou na equipe.` : ""}
      </p>
    </form>
  );
}
