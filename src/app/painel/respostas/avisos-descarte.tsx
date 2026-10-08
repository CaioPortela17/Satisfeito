"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import type { Aba } from "@/lib/respostas/lista";

type Avisos = {
  anunciarSucesso: (mensagem: string) => void;
  anunciarErro: (mensagem: string) => void;
};

const ContextoAvisos = createContext<Avisos | null>(null);

export function useAvisosDescarte(): Avisos {
  const contexto = useContext(ContextoAvisos);
  if (!contexto) throw new Error("useAvisosDescarte precisa estar dentro de AvisosDescarte");
  return contexto;
}

// Envolve a lista de respostas e cuida de duas coisas para leitor de tela e teclado:
// 1) Duas regiões "vivas" que ficam SEMPRE na página (só o texto muda). Leitores de tela
//    anunciam de forma confiável mudanças de texto numa região que já existia; uma região
//    que nasce já com texto às vezes é ignorada.
// 2) Foco: ao descartar/restaurar nas abas Suspeitas e Descartadas, o cartão some da lista e o
//    botão focado some junto (o foco cairia no <body>). Então levamos o foco para o menu de abas,
//    que sempre existe. Na aba Todas o cartão continua lá e o foco fica no mesmo botão.
export function AvisosDescarte({ aba, children }: { aba: Aba; children: ReactNode }) {
  const [status, setStatus] = useState("");
  const [alerta, setAlerta] = useState("");
  // Alterna um espaço invisível no fim: assim a mesma mensagem repetida ainda é anunciada de novo
  const alternar = useRef(false);

  function texto(mensagem: string) {
    alternar.current = !alternar.current;
    return alternar.current ? mensagem : `${mensagem} `;
  }

  const avisos: Avisos = {
    anunciarSucesso(mensagem) {
      setAlerta("");
      setStatus(texto(mensagem));
      if (aba !== "todas") document.getElementById("abas-respostas")?.focus();
    },
    anunciarErro(mensagem) {
      setStatus("");
      setAlerta(texto(mensagem));
    },
  };

  return (
    <ContextoAvisos.Provider value={avisos}>
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>
      <p role="alert" className="sr-only">
        {alerta}
      </p>
      {children}
    </ContextoAvisos.Provider>
  );
}
