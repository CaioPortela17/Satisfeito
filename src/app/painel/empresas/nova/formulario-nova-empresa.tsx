"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ErroDoCampo } from "@/components/formulario/erro-do-campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarEmpresa, type EstadoNovaEmpresa } from "../actions";

const estadoInicial: EstadoNovaEmpresa = {};

export function FormularioNovaEmpresa() {
  const [estado, acao, pendente] = useActionState(criarEmpresa, estadoInicial);

  return (
    <form action={acao} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="nome">Nome do negócio</Label>
        <Input
          id="nome"
          name="nome"
          placeholder="Ex.: Padaria Pão Quente, unidade Centro"
          autoComplete="organization"
          maxLength={100}
          autoFocus
          defaultValue={estado.valor}
          aria-invalid={Boolean(estado.erro)}
          aria-describedby={estado.erro ? "nome-erro" : undefined}
        />
        <ErroDoCampo id="nome-erro" erros={estado.erro ? [estado.erro] : undefined} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" size="lg" disabled={pendente}>
          {pendente ? "Criando…" : "Criar empresa"}
        </Button>
        <Button asChild size="lg" variant="ghost">
          <Link href="/painel">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
