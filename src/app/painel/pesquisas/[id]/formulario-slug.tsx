"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { alterarSlug, type EstadoAcao } from "../actions";

export function FormularioSlug({ id, slug, base }: { id: string; slug: string; base: string }) {
  const [editando, setEditando] = useState(false);
  const [anuncio, setAnuncio] = useState("");
  const devolverFoco = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const terminarEdicao = useCallback((novoAnuncio?: string) => {
    devolverFoco.current = true;
    setEditando(false);
    if (novoAnuncio) {
      // Limpa e escreve de novo: salvar duas vezes seguidas anuncia as duas
      setAnuncio("");
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setAnuncio(novoAnuncio), 100);
    }
  }, []);

  // Ao sair da edição, o foco volta para "Mudar o final do link"
  function aoMontarBotao(botao: HTMLButtonElement | null) {
    if (botao && devolverFoco.current) {
      devolverFoco.current = false;
      botao.focus();
    }
  }

  // O aviso para o leitor de tela fica sempre na página (montar junto com o texto não é anunciado)
  return (
    <>
      <p role="status" className="sr-only">
        {anuncio}
      </p>
      {editando ? (
        <EdicaoSlug id={id} slug={slug} base={base} aoTerminar={terminarEdicao} />
      ) : (
        <Button
          ref={aoMontarBotao}
          type="button"
          variant="ghost"
          className="-ml-3 min-h-11 px-3 text-ameixa hover:bg-ameixa/10"
          onClick={() => setEditando(true)}
        >
          Mudar o final do link
        </Button>
      )}
    </>
  );
}

function EdicaoSlug({
  id,
  slug,
  base,
  aoTerminar,
}: {
  id: string;
  slug: string;
  base: string;
  aoTerminar: (anuncio?: string) => void;
}) {
  const [estado, acao, pendente] = useActionState(alterarSlug, {} as EstadoAcao);

  useEffect(() => {
    if (estado.ok) aoTerminar(estado.anuncio);
  }, [estado.ok, estado.anuncio, aoTerminar]);

  return (
    <form
      action={acao}
      className="space-y-2"
      noValidate
      onKeyDown={(e) => e.key === "Escape" && aoTerminar()}
    >
      <input type="hidden" name="id" value={id} />
      <Label htmlFor="slug">Final do link</Label>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono text-sm break-all text-muted-foreground">{base}</span>
        <Input
          id="slug"
          name="slug"
          className="min-h-11 min-w-48 flex-1"
          defaultValue={estado.valor ?? slug}
          maxLength={60}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={Boolean(estado.erro)}
          aria-describedby={estado.erro ? "slug-ajuda slug-erro" : "slug-ajuda"}
        />
      </div>
      <p id="slug-ajuda" className="text-sm text-manga-texto">
        Se você já imprimiu o QR code, ele para de funcionar.
      </p>
      <div role="alert">
        {estado.erro && (
          <p id="slug-erro" className="text-sm font-medium text-destructive">
            {estado.erro}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" aria-disabled={pendente} className="min-h-11" onClick={(e) => pendente && e.preventDefault()}>
          {pendente ? "Salvando…" : "Salvar"}
        </Button>
        <Button type="button" variant="ghost" className="min-h-11" onClick={() => aoTerminar()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
