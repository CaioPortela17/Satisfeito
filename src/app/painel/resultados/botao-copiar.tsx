"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Estado = "parado" | "copiado" | "erro";

// Alternativa para navegador sem a API de área de transferência (ou sem permissão): seleciona um campo
// escondido e usa o comando antigo de copiar.
function copiarPeloCampo(texto: string): boolean {
  const campo = document.createElement("textarea");
  campo.value = texto;
  campo.setAttribute("readonly", "");
  campo.style.position = "fixed";
  campo.style.opacity = "0";
  document.body.appendChild(campo);
  campo.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(campo);
  }
}

// Copia o texto do relatório para colar no WhatsApp. O resultado é anunciado em uma região "viva"
// que já existe na página (leitor de tela) e o rótulo do botão volta ao normal depois de uns segundos.
export function BotaoCopiar({ texto }: { texto: string }) {
  const [estado, setEstado] = useState<Estado>("parado");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  async function copiar() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(texto);
      ok = true;
    } catch {
      ok = copiarPeloCampo(texto);
    }
    setEstado(ok ? "copiado" : "erro");
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setEstado("parado"), 4000);
  }

  const Icone = estado === "copiado" ? Check : Copy;
  return (
    <div>
      <Button type="button" className="min-h-11" onClick={copiar}>
        <Icone aria-hidden="true" />
        {estado === "copiado" ? "Copiado" : "Copiar para WhatsApp"}
      </Button>
      {estado === "erro" && (
        <p className="mt-2 text-sm font-medium text-destructive">
          Não deu para copiar sozinho. Selecione o texto acima e copie.
        </p>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {estado === "copiado" ? "Relatório copiado." : ""}
      </p>
    </div>
  );
}
