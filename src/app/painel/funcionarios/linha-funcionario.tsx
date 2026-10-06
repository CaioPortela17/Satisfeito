"use client";

import { Ellipsis } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  alterarAtivo,
  excluirFuncionario,
  renomearFuncionario,
  type EstadoAcao,
} from "./actions";

export type Funcionario = { id: string; nome: string; ativo: boolean };

export function LinhaFuncionario({ funcionario }: { funcionario: Funcionario }) {
  const [editando, setEditando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();

  // Roda uma action e mostra o erro, se houver
  function executar(acao: () => Promise<EstadoAcao>) {
    setErro(undefined);
    iniciar(async () => {
      const resultado = await acao();
      if (resultado.erro) setErro(resultado.erro);
    });
  }

  if (editando) {
    return <FormularioRenomear funcionario={funcionario} aoTerminar={() => setEditando(false)} />;
  }

  return (
    <li className="py-2">
      <div className="flex min-h-10 items-center gap-3">
        {/* Inicial do nome num círculo: ajuda a achar a pessoa de relance */}
        <span
          aria-hidden="true"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full font-bold",
            funcionario.ativo ? "bg-menta-claro text-menta-texto" : "bg-muted text-muted-foreground",
          )}
        >
          {funcionario.nome.charAt(0).toUpperCase()}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 font-medium break-words",
            !funcionario.ativo && "text-muted-foreground",
          )}
        >
          {funcionario.nome}
        </span>

        <div className="flex shrink-0 items-center gap-1">
          {/* Inativo: o atalho mais provável fica à vista, sem abrir o menu */}
          {!funcionario.ativo && (
            <Button
              variant="outline"
              disabled={pendente}
              onClick={() => executar(() => alterarAtivo(funcionario.id, true))}
            >
              Reativar
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-10"
                aria-label={`Ações para ${funcionario.nome}`}
                disabled={pendente}
              >
                <Ellipsis className="size-5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => setEditando(true)}>Renomear</DropdownMenuItem>
              {funcionario.ativo && (
                <DropdownMenuItem
                  onSelect={() => executar(() => alterarAtivo(funcionario.id, false))}
                >
                  Desativar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmandoExclusao(true)}>
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {erro && (
        <p role="alert" className="mt-1 pl-12 text-sm font-medium text-destructive">
          {erro}
        </p>
      )}

      <AlertDialog open={confirmandoExclusao} onOpenChange={setConfirmandoExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {funcionario.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso não tem volta. Se a pessoa só saiu da equipe, prefira Desativar: ela some da
              pesquisa, mas as avaliações dela continuam guardadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              // Vermelho cheio: deixa claro que é a ação perigosa da caixa
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => executar(() => excluirFuncionario(funcionario.id))}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

function FormularioRenomear({
  funcionario,
  aoTerminar,
}: {
  funcionario: Funcionario;
  aoTerminar: () => void;
}) {
  const [estado, acao, pendente] = useActionState(renomearFuncionario, {} as EstadoAcao);

  // Deu certo: volta a mostrar a linha normal, já com o nome novo
  useEffect(() => {
    if (estado.ok) aoTerminar();
  }, [estado.ok, aoTerminar]);

  const idErro = `erro-renomear-${funcionario.id}`;

  return (
    <li className="py-2">
      <form
        action={acao}
        className="flex flex-col gap-2 sm:flex-row"
        // Esc cancela, como em qualquer edição
        onKeyDown={(e) => e.key === "Escape" && aoTerminar()}
        noValidate
      >
        <input type="hidden" name="id" value={funcionario.id} />
        <Input
          name="nome"
          aria-label={`Novo nome para ${funcionario.nome}`}
          defaultValue={estado.valor ?? funcionario.nome}
          maxLength={60}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          autoComplete="off"
          aria-invalid={Boolean(estado.erro)}
          aria-describedby={estado.erro ? idErro : undefined}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar"}
          </Button>
          <Button type="button" variant="ghost" onClick={aoTerminar}>
            Cancelar
          </Button>
        </div>
      </form>
      {estado.erro && (
        <p id={idErro} role="alert" className="mt-1 text-sm font-medium text-destructive">
          {estado.erro}
        </p>
      )}
    </li>
  );
}
