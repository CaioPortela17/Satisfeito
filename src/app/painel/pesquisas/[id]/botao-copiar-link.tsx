"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function BotaoCopiarLink({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem permissão de área de transferência: o link continua visível para copiar à mão
    }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={copiar} className="min-h-11 rounded-full px-4">
        {copiado ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copiado ? "Copiado" : "Copiar link"}
      </Button>
      <p role="status" className="sr-only">
        {copiado ? "Link copiado." : ""}
      </p>
    </>
  );
}
