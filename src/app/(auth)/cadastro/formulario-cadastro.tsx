"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ErroDoCampo } from "@/components/formulario/erro-do-campo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cadastrar, type EstadoFormulario } from "../actions";

const estadoInicial: EstadoFormulario = {};

export function FormularioCadastro() {
  const [estado, acao, pendente] = useActionState(cadastrar, estadoInicial);

  return (
    <form action={acao} className="space-y-4" noValidate>
      {estado.erro && (
        <Alert variant="destructive">
          <AlertDescription>{estado.erro}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="nomeEmpresa">Nome do seu negócio</Label>
        <Input
          id="nomeEmpresa"
          name="nomeEmpresa"
          autoComplete="organization"
          placeholder="Ex.: Padaria Pão Quente"
          maxLength={100}
          required
          defaultValue={estado.valores?.nomeEmpresa}
          aria-invalid={Boolean(estado.erros?.nomeEmpresa)}
          aria-describedby={estado.erros?.nomeEmpresa ? "nome-erro" : undefined}
        />
        <ErroDoCampo id="nome-erro" erros={estado.erros?.nomeEmpresa} />
      </div>

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
        {/* Dica ao lado do rótulo: economiza uma linha e a tela cabe sem rolar */}
        <div className="flex items-center justify-between">
          <Label htmlFor="senha">Senha</Label>
          <span id="senha-dica" className="text-sm text-muted-foreground">
            mínimo 8 caracteres
          </span>
        </div>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          aria-invalid={Boolean(estado.erros?.senha)}
          aria-describedby={estado.erros?.senha ? "senha-erro senha-dica" : "senha-dica"}
        />
        <ErroDoCampo id="senha-erro" erros={estado.erros?.senha} />
      </div>

      <p className="text-sm text-muted-foreground">
        Ao criar a conta, você aceita os{" "}
        <Link href="/termos" className="font-semibold underline underline-offset-4">
          termos de uso
        </Link>{" "}
        e a{" "}
        <Link href="/privacidade" className="font-semibold underline underline-offset-4">
          política de privacidade
        </Link>
        .
      </p>

      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente ? "Criando conta…" : "Criar conta"}
      </Button>

      <p className="text-center text-base text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-coral-escuro underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
