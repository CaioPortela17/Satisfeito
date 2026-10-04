"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ErroDoCampo } from "@/components/formulario/erro-do-campo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { esqueciSenha, type EstadoFormulario } from "../actions";

const estadoInicial: EstadoFormulario = {};

export function FormularioEsqueciSenha() {
  const [estado, acao, pendente] = useActionState(esqueciSenha, estadoInicial);

  if (estado.sucesso) {
    return (
      <div className="space-y-5">
        <Alert role="status">
          <AlertDescription>{estado.sucesso}</AlertDescription>
        </Alert>
        <Link href="/entrar" className="block text-center text-base font-semibold underline underline-offset-4">
          Voltar para Entrar
        </Link>
      </div>
    );
  }

  return (
    <form action={acao} className="space-y-5" noValidate>
      {estado.erro && (
        <Alert variant="destructive">
          <AlertDescription>{estado.erro}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">E-mail da conta</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={estado.valores?.email}
          aria-invalid={Boolean(estado.erros?.email)}
          aria-describedby={estado.erros?.email ? "email-erro" : undefined}
        />
        <ErroDoCampo id="email-erro" erros={estado.erros?.email} />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente ? "Enviando…" : "Enviar link"}
      </Button>

      <Link href="/entrar" className="block text-center text-base underline underline-offset-4">
        Lembrei a senha
      </Link>
    </form>
  );
}
