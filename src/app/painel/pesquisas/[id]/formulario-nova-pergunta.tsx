"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { IconeTipoPergunta } from "@/components/icones/icone-tipo-pergunta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LIMITE_PERGUNTAS, type TipoPergunta } from "@/lib/pesquisas/esquemas";
import { DESCRICAO_TIPO, ROTULO_TIPO } from "@/lib/pesquisas/tipos";
import { cn } from "@/lib/utils";
import { adicionarPergunta, type EstadoAcao } from "../actions";

// Texto pronto para cada tipo: o dono só ajusta, se quiser
const TEXTO_INICIAL: Record<TipoPergunta, string> = {
  nota: "",
  texto: "",
  funcionario: "Quem te atendeu?",
};

export function FormularioNovaPergunta({
  pesquisaId,
  tiposDisponiveis,
  noLimite,
}: {
  pesquisaId: string;
  tiposDisponiveis: TipoPergunta[]; // sem "funcionario" se já houver uma valendo
  noLimite: boolean;
}) {
  const [estado, acao, pendente] = useActionState(adicionarPergunta, {} as EstadoAcao);
  const [tipo, setTipo] = useState<TipoPergunta>(tiposDisponiveis[0] ?? "nota");
  const campo = useRef<HTMLInputElement>(null);
  const aviso = useRef<HTMLParagraphElement>(null);

  // Tipo escolhido sumiu da lista (ex.: acabou de adicionar "Quem te atendeu?")
  const tipoValido = tiposDisponiveis.includes(tipo) ? tipo : (tiposDisponiveis[0] ?? "nota");

  // Depois de adicionar, o campo continua focado para a próxima
  useEffect(() => {
    if (estado.ok) campo.current?.focus();
  }, [estado.ok]);

  // Quando o formulário dá lugar ao aviso de limite, o foco vai para o aviso
  // (só na troca: ao abrir a página já no limite, o foco não é roubado)
  const estavaNoLimite = useRef(noLimite);
  useEffect(() => {
    if (noLimite && !estavaNoLimite.current) aviso.current?.focus();
    estavaNoLimite.current = noLimite;
  }, [noLimite]);

  if (noLimite) {
    return (
      <p
        ref={aviso}
        tabIndex={-1}
        role="status"
        className="rounded-2xl outline-none bg-manga-claro p-4 text-sm font-medium text-manga-texto">
        Pesquisas curtas recebem mais respostas. O limite é {LIMITE_PERGUNTAS} perguntas: para
        adicionar outra, tire uma da pesquisa.
      </p>
    );
  }

  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="pesquisaId" value={pesquisaId} />
      <fieldset>
        <legend className="mb-2 font-semibold">Tipo da pergunta</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {tiposDisponiveis.map((t) => (
            <label
              key={t}
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-2 rounded-2xl border-2 p-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                tipoValido === t ? "border-ameixa bg-creme" : "border-border hover:border-ameixa/40",
              )}
            >
              <input
                type="radio"
                name="tipo"
                value={t}
                checked={tipoValido === t}
                onChange={() => setTipo(t)}
                className="sr-only"
              />
              <IconeTipoPergunta tipo={t} className="mt-0.5 size-6 shrink-0" />
              <span>
                <span className="block font-semibold">{ROTULO_TIPO[t]}</span>
                <span className="block text-sm text-muted-foreground">{DESCRICAO_TIPO[t]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="nova-pergunta">Pergunta</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            // key: ao trocar o tipo, o campo recomeça com o texto pronto daquele tipo
            key={tipoValido}
            ref={campo}
            id="nova-pergunta"
            name="texto"
            className="min-h-11"
            placeholder="Ex.: Que nota você dá para a comida?"
            defaultValue={estado.valor ?? TEXTO_INICIAL[tipoValido]}
            maxLength={120}
            autoComplete="off"
            aria-invalid={Boolean(estado.erro)}
            aria-describedby={estado.erro ? "erro-nova-pergunta" : undefined}
          />
          <Button type="submit" disabled={pendente} className="min-h-11 sm:w-32">
            {pendente ? "Adicionando…" : "Adicionar"}
          </Button>
        </div>
        <div role="alert">
          {estado.erro && (
            <p id="erro-nova-pergunta" className="text-sm font-medium text-destructive">
              {estado.erro}
            </p>
          )}
        </div>
        <p role="status" className="sr-only">{estado.anuncio}</p>
      </div>
    </form>
  );
}
