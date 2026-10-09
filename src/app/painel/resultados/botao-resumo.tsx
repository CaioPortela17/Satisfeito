"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { mensagemResumo } from "@/lib/resumo/mensagens";
import { gerarResumoAction } from "./actions";

// Botão que pede o resumo ao servidor.
// useTransition: o React nos diz se a action ainda está rodando ("pendente"),
// sem travar a tela. Usamos isso para desativar o botão e trocar o texto.
export function BotaoResumo({
  pesquisaId,
  temResumo,
  desativadoRotulo,
}: {
  pesquisaId: string;
  temResumo: boolean;
  desativadoRotulo?: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  // Textos das regiões "vivas" para leitor de tela. As duas regiões ficam sempre na página
  // e só o texto muda, porque região que já existia é anunciada de forma mais confiável.
  const [status, setStatus] = useState("");
  const [alerta, setAlerta] = useState("");

  function gerar() {
    setErro("");
    setAlerta("");
    setStatus("Gerando o resumo…");
    iniciar(async () => {
      try {
        const resultado = await gerarResumoAction(pesquisaId);
        if (resultado.erro) {
          setErro(resultado.erro);
          setStatus("");
          setAlerta(resultado.erro);
        } else {
          setStatus("Resumo gerado.");
        }
      } catch {
        // Sem internet ou servidor fora do ar: mensagem amigável, nunca o erro técnico
        const mensagem = mensagemResumo("geral");
        setErro(mensagem);
        setStatus("");
        setAlerta(mensagem);
      }
    });
  }

  const rotuloBase = temResumo ? "Atualizar resumo" : "Gerar resumo";
  const rotulo = pendente ? "Gerando…" : (desativadoRotulo ?? rotuloBase);

  return (
    <div>
      <Button
        type="button"
        variant={temResumo ? "outline" : "default"}
        className="min-h-11"
        disabled={pendente || Boolean(desativadoRotulo)}
        onClick={gerar}
      >
        {rotulo}
      </Button>
      {/* Erro visível, sem role="alert" para o leitor de tela não anunciar duas vezes */}
      {erro && <p className="mt-2 text-sm font-medium text-destructive">{erro}</p>}
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>
      <p role="alert" className="sr-only">
        {alerta}
      </p>
    </div>
  );
}
