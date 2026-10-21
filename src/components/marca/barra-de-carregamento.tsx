"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

// Barra fina no topo que enche enquanto a próxima página carrega (como a do YouTube).
// Começa quando a pessoa clica num link interno e termina quando o endereço da página muda.
// Sem biblioteca: ouvimos o clique em links e comparamos o endereço antes e depois.

const LIMITE_ANDANDO = 90; // enquanto carrega, a barra nunca passa de 90%
const TEMPO_MAXIMO = 15_000; // se a página não chegar, a barra some sozinha

// O clique é de navegação interna "normal"? (sem Ctrl/Cmd, nova aba, download ou só âncora #)
function destinoDoClique(e: MouseEvent): URL | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const link = (e.target as Element | null)?.closest?.("a");
  if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return null;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
  return url;
}

function Barra() {
  const caminho = usePathname();
  const busca = useSearchParams().toString();
  const [largura, setLargura] = useState(0);
  const [visivel, setVisivel] = useState(false);
  const andando = useRef(false);
  const timers = useRef<{ passo?: ReturnType<typeof setInterval>; limite?: ReturnType<typeof setTimeout>; fim?: ReturnType<typeof setTimeout> }>({});

  function parar() {
    clearInterval(timers.current.passo);
    clearTimeout(timers.current.limite);
  }

  function terminar() {
    if (!andando.current) return;
    andando.current = false;
    parar();
    setLargura(100);
    // Deixa a barra chegar ao fim, some e volta a zero sem animação
    timers.current.fim = setTimeout(() => {
      setVisivel(false);
      setLargura(0);
    }, 300);
  }

  function comecar() {
    clearTimeout(timers.current.fim);
    parar();
    andando.current = true;
    setVisivel(true);
    setLargura(8);
    // Cada passo anda uma fração do que falta até o limite: começa rápido e desacelera
    timers.current.passo = setInterval(() => {
      setLargura((l) => l + (LIMITE_ANDANDO - l) * 0.12);
    }, 250);
    timers.current.limite = setTimeout(terminar, TEMPO_MAXIMO);
  }

  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      if (destinoDoClique(e)) comecar();
    };
    const t = timers.current; // o objeto é sempre o mesmo; só as propriedades mudam
    // Fase de captura: o <Link> do Next já chama preventDefault() no clique, e a captura roda antes dele
    document.addEventListener("click", aoClicar, true);
    return () => {
      document.removeEventListener("click", aoClicar, true);
      clearInterval(t.passo);
      clearTimeout(t.limite);
      clearTimeout(t.fim);
    };
    // comecar/parar só mexem em refs e setters estáveis
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A página mudou: termina a barra
  useEffect(() => {
    terminar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caminho, busca]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 print:hidden"
      style={{ opacity: visivel ? 1 : 0, transition: "opacity 200ms ease-out" }}
    >
      <div
        className="h-full origin-left bg-coral"
        style={{
          transform: `scaleX(${largura / 100})`,
          transition: visivel ? "transform 250ms ease-out" : "none",
        }}
      />
    </div>
  );
}

// useSearchParams precisa de Suspense; a barra não mostra nada enquanto isso
export function BarraDeCarregamento() {
  return (
    <Suspense fallback={null}>
      <Barra />
    </Suspense>
  );
}
