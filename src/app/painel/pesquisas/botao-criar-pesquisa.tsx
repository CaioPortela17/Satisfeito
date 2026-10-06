"use client";

import { Plus } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { criarPesquisa, type EstadoAcao } from "./actions";

const estadoInicial: EstadoAcao = {};

// Cria a pesquisa já com as perguntas sugeridas e abre o editor
export function BotaoCriarPesquisa() {
  const [estado, acao, pendente] = useActionState(criarPesquisa, estadoInicial);

  return (
    <form action={acao} className="space-y-2">
      <Button type="submit" size="lg" disabled={pendente}>
        <Plus aria-hidden="true" />
        {pendente ? "Criando…" : "Criar pesquisa"}
      </Button>
      <div role="alert">
        {estado.erro && <p className="text-sm font-medium text-destructive">{estado.erro}</p>}
      </div>
    </form>
  );
}
