"use client";

import { Ellipsis, Pause, Pencil, Play } from "lucide-react";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
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
  alterarAtivaPesquisa,
  excluirPesquisa,
  renomearPesquisa,
  type EstadoAcao,
} from "../actions";

type Props = { id: string; titulo: string; ativa: boolean };

export function CabecalhoPesquisa({ id, titulo, ativa }: Props) {
  const [editando, setEditando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [erro, setErro] = useState<string>();
  const [anuncio, setAnuncio] = useState("");
  const [pendente, iniciar] = useTransition();
  const devolverFoco = useRef(false);
  const botaoMais = useRef<HTMLButtonElement>(null);

  function executar(acao: () => Promise<EstadoAcao>) {
    setErro(undefined);
    iniciar(async () => {
      const r = await acao();
      if (r.erro) setErro(r.erro);
      if (r.anuncio) setAnuncio(r.anuncio);
    });
  }

  const terminarEdicao = useCallback(() => {
    devolverFoco.current = true;
    setEditando(false);
  }, []);

  // Ao sair da edição, o foco volta para o botão "Renomear"
  function aoMontarBotaoRenomear(botao: HTMLButtonElement | null) {
    if (botao && devolverFoco.current) {
      devolverFoco.current = false;
      botao.focus();
    }
  }

  return (
    <div className="space-y-3">
      {editando ? (
        <FormularioTitulo id={id} titulo={titulo} aoTerminar={terminarEdicao} />
      ) : (
        <div className="flex items-start gap-2">
          <h1 className="min-w-0 text-3xl font-bold tracking-tight break-words sm:text-4xl">{titulo}</h1>
          <Button
            ref={aoMontarBotaoRenomear}
            variant="ghost"
            size="icon"
            className="mt-0.5 size-11 shrink-0 text-ameixa hover:bg-ameixa/10"
            aria-label="Renomear pesquisa"
            onClick={() => setEditando(true)}
          >
            <Pencil className="size-5" aria-hidden="true" />
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-semibold",
            ativa ? "bg-menta-claro text-menta-texto" : "bg-manga-claro text-manga-texto",
          )}
        >
          {ativa ? "Recebendo respostas" : "Pausada"}
        </span>
        {/* aria-disabled (e não disabled): o botão desabilitado perde o foco do teclado */}
        <Button
          variant="outline"
          aria-disabled={pendente}
          className="min-h-11 aria-disabled:opacity-60"
          onClick={() => {
            if (!pendente) executar(() => alterarAtivaPesquisa(id, !ativa));
          }}
        >
          {ativa ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          {ativa ? (pendente ? "Pausando…" : "Pausar") : pendente ? "Retomando…" : "Retomar"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={botaoMais}
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Mais ações da pesquisa"
            >
              <Ellipsis className="size-5" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmandoExclusao(true)}>
              Excluir pesquisa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div role="alert">{erro && <p className="text-sm font-medium text-destructive">{erro}</p>}</div>
      <p role="status" className="sr-only">{anuncio}</p>

      <AlertDialog open={confirmandoExclusao} onOpenChange={setConfirmandoExclusao}>
        <AlertDialogContent
          // O item do menu já sumiu: sem isto o foco cairia no topo da página
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            botaoMais.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir &ldquo;{titulo}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              A pesquisa e as perguntas somem de vez. Se só quer parar de receber respostas por um
              tempo, prefira Pausar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => executar(() => excluirPesquisa(id))}
            >
              Excluir pesquisa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FormularioTitulo({
  id,
  titulo,
  aoTerminar,
}: {
  id: string;
  titulo: string;
  aoTerminar: () => void;
}) {
  const [estado, acao, pendente] = useActionState(renomearPesquisa, {} as EstadoAcao);

  useEffect(() => {
    if (estado.ok) aoTerminar();
  }, [estado.ok, aoTerminar]);

  return (
    <div>
      <form
        action={acao}
        className="flex flex-col gap-2 sm:flex-row"
        onKeyDown={(e) => e.key === "Escape" && aoTerminar()}
        noValidate
      >
        <input type="hidden" name="id" value={id} />
        <Input
          className="min-h-11"
          name="titulo"
          aria-label="Nome da pesquisa"
          defaultValue={estado.valor ?? titulo}
          maxLength={80}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          autoComplete="off"
          aria-invalid={Boolean(estado.erro)}
          aria-describedby={estado.erro ? "erro-titulo" : undefined}
        />
        <div className="flex gap-2">
          <Button type="submit" className="min-h-11" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar"}
          </Button>
          <Button type="button" variant="ghost" className="min-h-11" onClick={aoTerminar}>
            Cancelar
          </Button>
        </div>
      </form>
      {estado.erro && (
        <p id="erro-titulo" role="alert" className="mt-1 text-sm font-medium text-destructive">
          {estado.erro}
        </p>
      )}
    </div>
  );
}
