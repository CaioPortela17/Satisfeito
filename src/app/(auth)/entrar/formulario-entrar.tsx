"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ErroDoCampo } from "@/components/formulario/erro-do-campo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { entrar, type EstadoFormulario } from "../actions";

const estadoInicial: EstadoFormulario = {};

export function FormularioEntrar({ next }: { next?: string }) {
  // useActionState: chama a Server Action e guarda o que ela devolveu.
  // "pendente" fica true enquanto o servidor responde.
  const [estado, acao, pendente] = useActionState(entrar, estadoInicial);

  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />

      {estado.erro && (
        <Alert variant="destructive">
          <AlertDescription>{estado.erro}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="senha">Senha</Label>
          <Link href="/esqueci-senha" className="text-sm underline underline-offset-4">
            Esqueci minha senha
          </Link>
        </div>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(estado.erros?.senha)}
          aria-describedby={estado.erros?.senha ? "senha-erro" : undefined}
        />
        <ErroDoCampo id="senha-erro" erros={estado.erros?.senha} />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente ? "Entrando…" : "Entrar"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-coral-escuro underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
