"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

// O que usamos da API global que o script da Cloudflare cria
type OpcoesTurnstile = {
  sitekey: string;
  appearance: "interaction-only";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};
declare global {
  interface Window {
    turnstile?: {
      render: (elemento: HTMLElement, opcoes: OpcoesTurnstile) => string;
      remove: (id: string) => void;
    };
  }
}

// Widget invisível: só aparece se a Cloudflare precisar de um clique.
// Quando aprova, avisa o formulário com o token; quando expira ou dá erro, avisa com "".
export function WidgetTurnstile({ aoMudar }: { aoMudar: (token: string) => void }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const chave = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!pronto || !chave || !caixa.current || !window.turnstile) return;
    const id = window.turnstile.render(caixa.current, {
      sitekey: chave,
      appearance: "interaction-only",
      callback: aoMudar,
      "expired-callback": () => aoMudar(""),
      "error-callback": () => aoMudar(""),
    });
    return () => window.turnstile?.remove(id); // limpa ao desmontar
  }, [pronto, aoMudar]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setPronto(true)}
      />
      <div ref={caixa} className="flex justify-center" />
    </>
  );
}
