"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { mensagemErroDescarte } from "@/lib/respostas/lista";
import { useAvisosDescarte } from "./avisos-descarte";
import {
  descartarResposta,
  descartarVarias,
  restaurarResposta,
  type EstadoDescarte,
} from "./actions";

// useTransition: o React nos diz se a action ainda está rodando ("pendente"),
// sem travar a tela. Usamos isso para desativar o botão e trocar o texto.
// "sucesso" é o texto anunciado a leitores de tela quando a ação dá certo.
function useAcaoDescarte() {
  const { anunciarSucesso, anunciarErro } = useAvisosDescarte();
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();

  function executar(acao: () => Promise<EstadoDescarte>, sucesso: string) {
    setErro(undefined);
    iniciar(async () => {
      try {
        const resultado = await acao();
        if (resultado.erro) {
          setErro(resultado.erro);
          anunciarErro(resultado.erro);
        } else {
          anunciarSucesso(sucesso);
        }
      } catch {
        // Sem internet ou servidor fora do ar: mostra a mensagem amigável em vez de quebrar a página
        setErro(mensagemErroDescarte());
        anunciarErro(mensagemErroDescarte());
      }
    });
  }

  return { erro, pendente, executar };
}

function MensagemErro({ erro }: { erro?: string }) {
  if (!erro) return null;
  return (
    <p className="mt-1 text-sm font-medium text-destructive">
      {erro}
    </p>
  );
}

export function BotaoDescarte({ id, descartada }: { id: string; descartada: boolean }) {
  const { erro, pendente, executar } = useAcaoDescarte();

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 aria-disabled:opacity-60"
        aria-disabled={pendente}
        onClick={() => {
          if (pendente) return;
          executar(
            () => (descartada ? restaurarResposta(id) : descartarResposta(id)),
            descartada ? "Resposta restaurada." : "Resposta descartada.",
          );
        }}
      >
        {descartada
          ? pendente
            ? "Restaurando…"
            : "Restaurar"
          : pendente
            ? "Descartando…"
            : "Descartar"}
      </Button>
      <MensagemErro erro={erro} />
    </div>
  );
}

export function BotaoDescartarSuspeitas({ ids }: { ids: string[] }) {
  const { erro, pendente, executar } = useAcaoDescarte();

  if (ids.length === 0) return null;

  const rotulo =
    ids.length === 1
      ? "Descartar a suspeita desta página"
      : `Descartar as ${ids.length} suspeitas desta página`;

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 aria-disabled:opacity-60"
        aria-disabled={pendente}
        onClick={() => {
          if (pendente) return;
          executar(
            () => descartarVarias(ids),
            ids.length === 1 ? "1 resposta descartada." : `${ids.length} respostas descartadas.`,
          );
        }}
      >
        {pendente ? "Descartando…" : rotulo}
      </Button>
      <MensagemErro erro={erro} />
    </div>
  );
}
