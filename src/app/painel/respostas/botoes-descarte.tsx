"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { mensagemErroDescarte } from "@/lib/respostas/lista";
import {
  descartarResposta,
  descartarVarias,
  restaurarResposta,
  type EstadoDescarte,
} from "./actions";

// useTransition: o React nos diz se a action ainda está rodando ("pendente"),
// sem travar a tela. Usamos isso para desativar o botão e trocar o texto.
function useAcaoDescarte() {
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();

  function executar(acao: () => Promise<EstadoDescarte>) {
    setErro(undefined);
    iniciar(async () => {
      try {
        const resultado = await acao();
        if (resultado.erro) setErro(resultado.erro);
      } catch {
        // Sem internet ou servidor fora do ar: mostra a mensagem amigável em vez de quebrar a página
        setErro(mensagemErroDescarte());
      }
    });
  }

  return { erro, pendente, executar };
}

function MensagemErro({ erro }: { erro?: string }) {
  if (!erro) return null;
  return (
    <p role="alert" className="mt-1 text-sm font-medium text-destructive">
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
        className="min-h-11"
        disabled={pendente}
        onClick={() => executar(() => (descartada ? restaurarResposta(id) : descartarResposta(id)))}
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
        className="min-h-11"
        disabled={pendente}
        onClick={() => executar(() => descartarVarias(ids))}
      >
        {pendente ? "Descartando…" : rotulo}
      </Button>
      <MensagemErro erro={erro} />
    </div>
  );
}
