"use client";

import { useActionState } from "react";
import { ErroDoCampo } from "@/components/formulario/erro-do-campo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redefinirSenha, type EstadoFormulario } from "../actions";

const estadoInicial: EstadoFormulario = {};

export function FormularioRedefinirSenha() {
  const [estado, acao, pendente] = useActionState(redefinirSenha, estadoInicial);

  return (
    <form action={acao} className="space-y-4" noValidate>
      {estado.erro && (
        <Alert variant="destructive">
          <AlertDescription>{estado.erro}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="senha">Nova senha</Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          aria-invalid={Boolean(estado.erros?.senha)}
          aria-describedby={estado.erros?.senha ? "senha-erro" : "senha-dica"}
        />
        {estado.erros?.senha ? (
          <ErroDoCampo id="senha-erro" erros={estado.erros.senha} />
        ) : (
          <p id="senha-dica" className="text-sm text-muted-foreground">
            Pelo menos 8 caracteres.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmacao">Repita a nova senha</Label>
        <Input
          id="confirmacao"
          name="confirmacao"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(estado.erros?.confirmacao)}
          aria-describedby={estado.erros?.confirmacao ? "confirmacao-erro" : undefined}
        />
        <ErroDoCampo id="confirmacao-erro" erros={estado.erros?.confirmacao} />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
