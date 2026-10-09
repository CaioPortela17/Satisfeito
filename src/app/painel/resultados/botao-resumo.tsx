"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { mensagemResumo } from "@/lib/resumo/mensagens";
import { gerarResumoAction } from "./actions";

// Botão que pede o resumo ao servidor.
// useTransition: o React nos diz se a action ainda está rodando ("pendente"),
// sem travar a tela. Usamos isso para desativar o botão e trocar o texto.
// Importante: o resumo-ia.tsx mantém este componente sempre no mesmo lugar da árvore,
// assim ele não é recriado quando o resumo aparece e as regiões "vivas" abaixo continuam anunciando.
export function BotaoResumo({
  pesquisaId,
  temResumo,
  motivoDesativado,
}: {
  pesquisaId: string;
  temResumo: boolean;
  // Por que o botão está desligado (intervalo ou limite do dia). Aparece como texto normal,
  // fora do botão, porque o botão desativado fica com metade da opacidade.
  motivoDesativado?: string;
}) {
  const idMotivo = useId();
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
  const rotulo = pendente ? "Gerando…" : rotuloBase;

  return (
    <div>
      <Button
        type="button"
        variant={temResumo ? "outline" : "default"}
        className="min-h-11"
        disabled={pendente || Boolean(motivoDesativado)}
        aria-describedby={motivoDesativado ? idMotivo : undefined}
        onClick={gerar}
      >
        {rotulo}
      </Button>
      {motivoDesativado && (
        <p id={idMotivo} className="mt-2 text-sm text-muted-foreground">
          {motivoDesativado}
        </p>
      )}
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
