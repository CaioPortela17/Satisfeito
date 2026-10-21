"use client";

import { ArrowDown, ArrowUp, Ellipsis } from "lucide-react";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { IconeTipoPergunta } from "@/components/icones/icone-tipo-pergunta";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { TipoPergunta } from "@/lib/pesquisas/esquemas";
import { ROTULO_TIPO } from "@/lib/pesquisas/tipos";
import {
  arquivarPergunta,
  editarTextoPergunta,
  moverPergunta,
  type EstadoAcao,
} from "../actions";

export type PerguntaEditor = {
  id: string;
  texto: string;
  tipo: TipoPergunta;
  obrigatoria: boolean;
  arquivada: boolean;
};

// Quando a linha sai da lista (tirar/devolver), ela leva o próprio aviso junto.
// Por isso o foco vai para o título "Perguntas" e o aviso fala pela região da página.
function focarTituloEAnunciar(frase: string) {
  document.getElementById("titulo-perguntas")?.focus();
  anunciarNaPagina(frase);
}

// Fala pela região fixa da página (a linha pode mudar de lugar no DOM e perder o aviso)
function anunciarNaPagina(frase: string) {
  const regiao = document.getElementById("anuncio-perguntas");
  if (regiao) {
    regiao.textContent = "";
    // Troca o texto logo depois para o leitor de tela reler a frase
    setTimeout(() => {
      regiao.textContent = frase;
    }, 50);
  }
}

// Roda uma action, mostra erro e anuncia o resultado para o leitor de tela
function useExecutar() {
  const [erro, setErro] = useState<string>();
  const [anuncio, setAnuncio] = useState("");
  const [pendente, iniciar] = useTransition();
  function executar(acao: () => Promise<EstadoAcao>, aoConcluir?: (r: EstadoAcao) => void) {
    setErro(undefined);
    iniciar(async () => {
      const r = await acao();
      if (r.erro) setErro(r.erro);
      if (r.anuncio) setAnuncio(r.anuncio);
      if (!r.erro) aoConcluir?.(r);
    });
  }
  return { erro, anuncio, pendente, executar };
}

export function LinhaPergunta({
  pergunta,
  posicao,
  total,
}: {
  pergunta: PerguntaEditor;
  posicao: number; // 1, 2, 3…
  total: number;
}) {
  const [editando, setEditando] = useState(false);
  const { erro, anuncio, pendente, executar } = useExecutar();
  const devolverFoco = useRef(false);
  const focarDepoisDeMover = useRef<"subir" | "descer" | null>(null);
  const botaoSubir = useRef<HTMLButtonElement>(null);
  const botaoDescer = useRef<HTMLButtonElement>(null);
  const botaoAcoes = useRef<HTMLButtonElement | null>(null);

  const primeira = posicao === 1;
  const ultima = posicao === total;

  // Depois de subir/descer a posição muda: o foco acompanha a pergunta.
  // Se ela chegou na ponta, a seta clicada fica inativa; o foco vai para a outra.
  useEffect(() => {
    const direcao = focarDepoisDeMover.current;
    if (!direcao) return;
    focarDepoisDeMover.current = null;
    const alvo =
      direcao === "subir" ? (primeira ? botaoDescer : botaoSubir) : ultima ? botaoSubir : botaoDescer;
    (alvo.current ?? botaoAcoes.current)?.focus();
  }, [posicao, primeira, ultima]);

  function mover(direcao: "subir" | "descer") {
    if (pendente) return;
    focarDepoisDeMover.current = direcao;
    executar(async () => {
      const r = await moverPergunta(pergunta.id, direcao);
      // Deu erro: não deixa o foco pendente puxar o foco para esta linha depois
      if (r.erro) focarDepoisDeMover.current = null;
      // O aviso sai pela região da página, não pelo role=status da linha (que se move)
      if (r.anuncio) anunciarNaPagina(r.anuncio);
      return { ...r, anuncio: undefined };
    });
  }

  const terminarEdicao = useCallback(() => {
    devolverFoco.current = true;
    setEditando(false);
  }, []);

  // Ref de callback: quando o ⋯ reaparece depois da edição, recebe o foco
  // (useCallback: uma ref que muda a cada render faz o menu do Radix entrar em loop)
  const aoMontarBotaoAcoes = useCallback((botao: HTMLButtonElement | null) => {
    botaoAcoes.current = botao;
    if (botao && devolverFoco.current) {
      devolverFoco.current = false;
      botao.focus();
    }
  }, []);

  if (editando) {
    return <FormularioTextoPergunta pergunta={pergunta} aoTerminar={terminarEdicao} />;
  }

  // aria-disabled (e não disabled): o botão desabilitado perde o foco do teclado
  const classeSeta = "size-11 aria-disabled:pointer-events-none aria-disabled:opacity-40";

  return (
    <li className="py-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
      <div className="flex items-start gap-3">
        <span className="numeros mt-2.5 w-5 shrink-0 text-right font-bold text-muted-foreground">
          {posicao}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-semibold text-muted-foreground">
            <IconeTipoPergunta tipo={pergunta.tipo} className="size-5 shrink-0" />
            {ROTULO_TIPO[pergunta.tipo]}
          </p>
          <p className="mt-0.5 font-medium break-words">{pergunta.texto}</p>
        </div>
        <div className="-mr-2 flex shrink-0 items-center">
          <Button
            ref={botaoSubir}
            variant="ghost"
            size="icon"
            className={classeSeta}
            aria-label={`Subir \u201C${pergunta.texto}\u201D`}
            aria-disabled={primeira || pendente}
            onClick={() => {
              if (!primeira) mover("subir");
            }}
          >
            <ArrowUp className="size-5" aria-hidden="true" />
          </Button>
          <Button
            ref={botaoDescer}
            variant="ghost"
            size="icon"
            className={classeSeta}
            aria-label={`Descer \u201C${pergunta.texto}\u201D`}
            aria-disabled={ultima || pendente}
            onClick={() => {
              if (!ultima) mover("descer");
            }}
          >
            <ArrowDown className="size-5" aria-hidden="true" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                ref={aoMontarBotaoAcoes}
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={`Ações para \u201C${pergunta.texto}\u201D`}
              >
                <Ellipsis className="size-5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="min-h-11" onSelect={() => setEditando(true)}>
                Editar texto
              </DropdownMenuItem>
              <DropdownMenuItem
                className="min-h-11"
                onSelect={() => {
                  if (!pendente)
                    executar(
                      () => arquivarPergunta(pergunta.id, true),
                      (r) => focarTituloEAnunciar(r.anuncio ?? "Pergunta tirada da pesquisa."),
                    );
                }}
              >
                Tirar da pesquisa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div role="alert">
        {erro && <p className="mt-1 pl-8 text-sm font-medium text-destructive">{erro}</p>}
      </div>
      <p role="status" className="sr-only">{anuncio}</p>
    </li>
  );
}

export function LinhaPerguntaArquivada({
  pergunta,
  podeDevolver,
}: {
  pergunta: PerguntaEditor;
  podeDevolver: boolean; // falso quando a pesquisa já está com 10 perguntas
}) {
  const { erro, pendente, executar } = useExecutar();
  const bloqueado = !podeDevolver || pendente;

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <IconeTipoPergunta tipo={pergunta.tipo} className="size-5 shrink-0 grayscale" />
        <p className="min-w-0 flex-1 break-words text-muted-foreground">{pergunta.texto}</p>
        {/* aria-disabled mantém o botão no teclado; o motivo aparece logo abaixo */}
        <Button
          variant="outline"
          className="min-h-11 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          aria-disabled={bloqueado}
          aria-label={`Devolver \u201C${pergunta.texto}\u201D para a pesquisa`}
          onClick={() => {
            if (bloqueado) return;
            executar(
              () => arquivarPergunta(pergunta.id, false),
              (r) => focarTituloEAnunciar(r.anuncio ?? "Pergunta devolvida para a pesquisa."),
            );
          }}
        >
          Devolver
        </Button>
      </div>
      {!podeDevolver && (
        <p className="mt-1 pl-8 text-sm text-muted-foreground">
          A pesquisa já está com o máximo de perguntas.
        </p>
      )}
      <div role="alert">
        {erro && <p className="mt-1 text-sm font-medium text-destructive">{erro}</p>}
      </div>
    </li>
  );
}

function FormularioTextoPergunta({
  pergunta,
  aoTerminar,
}: {
  pergunta: PerguntaEditor;
  aoTerminar: () => void;
}) {
  const [estado, acao, pendente] = useActionState(editarTextoPergunta, {} as EstadoAcao);

  useEffect(() => {
    if (estado.ok) aoTerminar();
  }, [estado.ok, aoTerminar]);

  const idErro = `erro-pergunta-${pergunta.id}`;

  return (
    <li className="py-3">
      <form
        action={acao}
        className="flex flex-col gap-2 sm:flex-row"
        onKeyDown={(e) => e.key === "Escape" && aoTerminar()}
        noValidate
      >
        <input type="hidden" name="id" value={pergunta.id} />
        <Input
          className="min-h-11"
          name="texto"
          aria-label={`Novo texto para \u201C${pergunta.texto}\u201D`}
          defaultValue={estado.valor ?? pergunta.texto}
          maxLength={120}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          autoComplete="off"
          aria-invalid={Boolean(estado.erro)}
          aria-describedby={estado.erro ? idErro : undefined}
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
        <p id={idErro} role="alert" className="mt-1 text-sm font-medium text-destructive">
          {estado.erro}
        </p>
      )}
    </li>
  );
}
