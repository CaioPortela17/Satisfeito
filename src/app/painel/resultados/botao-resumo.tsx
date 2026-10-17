"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { Periodo } from "@/lib/painel/tipos";
import { mensagemResumo } from "@/lib/resumo/mensagens";
import { gerarResumoAction } from "./actions";

// Botão que pede o relatório ao servidor, com a opção de citar nomes e notas da equipe.
// useTransition: o React nos diz se a action ainda está rodando ("pendente"),
// sem travar a tela. Usamos isso para desativar o botão e trocar o texto.
// Importante: o resumo-ia.tsx mantém este componente sempre no mesmo lugar da árvore,
// assim ele não é recriado quando o relatório aparece e as regiões "vivas" abaixo continuam anunciando.
export function BotaoResumo({
  pesquisaId,
  dias,
  temResumo,
  motivoDesativado,
}: {
  pesquisaId: string;
  dias: Periodo;
  temResumo: boolean;
  // Por que o botão está desligado (intervalo ou limite do dia). Aparece como texto normal,
  // fora do botão, porque o botão desativado fica com metade da opacidade.
  motivoDesativado?: string;
}) {
  const idMotivo = useId();
  const idNomes = useId();
  const idAjudaNomes = useId();
  const [pendente, iniciar] = useTransition();
  const [comNomes, setComNomes] = useState(false);
  const [erro, setErro] = useState("");
  // Textos das regiões "vivas" para leitor de tela. As duas regiões ficam sempre na página
  // e só o texto muda, porque região que já existia é anunciada de forma mais confiável.
  const [status, setStatus] = useState("");
  const [alerta, setAlerta] = useState("");

  function gerar() {
    setErro("");
    setAlerta("");
    setStatus("Gerando o relatório…");
    iniciar(async () => {
      try {
        const resultado = await gerarResumoAction(pesquisaId, dias, comNomes);
        if (resultado.erro) {
          setErro(resultado.erro);
          setStatus("");
          setAlerta(resultado.erro);
        } else {
          setStatus("Relatório gerado.");
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

  const rotuloBase = temResumo ? "Gerar novo relatório" : "Gerar relatório";
  const rotulo = pendente ? "Gerando…" : rotuloBase;

  return (
    <div>
      {/* Caixa de seleção própria com alvo de toque de 44 px: o rótulo inteiro é clicável */}
      <label htmlFor={idNomes} className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
        <input
          id={idNomes}
          type="checkbox"
          checked={comNomes}
          disabled={pendente}
          aria-describedby={idAjudaNomes}
          onChange={(e) => setComNomes(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-ameixa"
        />
        <span className="font-medium">Citar nomes e notas da equipe</span>
      </label>
      <p id={idAjudaNomes} className="mb-3 text-sm text-muted-foreground">
        Desligado, o relatório fala só da equipe como um todo e nenhum nome é enviado à IA.
      </p>

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
