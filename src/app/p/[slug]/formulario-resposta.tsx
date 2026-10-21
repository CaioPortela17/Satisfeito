"use client";

import { startTransition, useActionState, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { IconeObrigado } from "@/components/icones/icone-obrigado";
import { Button } from "@/components/ui/button";
import { faixaDaNota } from "@/lib/notas/faixa";
import { LIMITE_TEXTO_RESPOSTA, NOTA_MINIMA_SEM_MELHORAR, type PerguntaPublica } from "@/lib/respostas/formulario";
import { cn } from "@/lib/utils";
import { enviarResposta } from "./actions";
import type { EstadoEnvio } from "./tipos";
import { WidgetTurnstile } from "./widget-turnstile";

const ROTULO_FAIXA = { boa: "Ótimo", atencao: "Pode melhorar", ruim: "Ruim" } as const;
const COR_FAIXA = {
  boa: "bg-menta text-ameixa",
  atencao: "bg-manga text-ameixa",
  ruim: "bg-coral text-ameixa",
} as const;

const SOMBRA_CARTAO = "shadow-[0_8px_24px_rgba(42,31,45,0.12)]";

// "Já respondeu hoje": marca no navegador (só uma ajuda, não impede quem limpa os dados; quem protege de verdade é o servidor)
function chave(pesquisaId: string) {
  return `satisfeito:respondeu:${pesquisaId}`;
}
function hoje() {
  return new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD no fuso do celular
}
function lerMarca(pesquisaId: string) {
  try {
    return localStorage.getItem(chave(pesquisaId)) === hoje();
  } catch {
    return false; // navegação privada etc.: mostra o formulário
  }
}
function gravarMarca(pesquisaId: string) {
  try {
    localStorage.setItem(chave(pesquisaId), hoje());
  } catch {
    // sem localStorage: tudo bem, só não lembramos que respondeu
  }
}
const nada = () => () => {};

type Props = {
  slug: string;
  pesquisaId: string;
  titulo: string;
  empresa: string;
  perguntas: PerguntaPublica[];
  carimbo: string;
};

export function FormularioResposta({ slug, pesquisaId, titulo, empresa, perguntas, carimbo }: Props) {
  const [estado, acao, pendente] = useActionState(enviarResposta, {} as EstadoEnvio);
  const [valores, setValores] = useState<Record<string, string>>({});
  const jaRespondeu = useSyncExternalStore(nada, () => lerMarca(pesquisaId), () => false);
  const obrigado = useRef<HTMLHeadingElement>(null);
  const [token, setToken] = useState("");
  const [rodada, setRodada] = useState(0); // trocar a "rodada" recria o widget e gera token novo
  const [demorouEm, setDemorouEm] = useState(-1); // rodada em que a confirmação passou de 10 s
  const demorou = !token && demorouEm === rodada;

  // Chegou token: zera o aviso de demora, para ele não reaparecer se o token expirar e for renovado
  const aoMudarToken = useCallback((novo: string) => {
    setToken(novo);
    if (novo) setDemorouEm(-1);
  }, []);

  // Se o token não chega em 10 s (script bloqueado, rede ruim), avisa em vez de ficar parado
  useEffect(() => {
    if (token) return;
    const timer = setTimeout(() => setDemorouEm(rodada), 10_000);
    return () => clearTimeout(timer);
  }, [token, rodada]);

  const erros = estado.erros ?? {};

  useEffect(() => {
    if (estado.enviado) {
      gravarMarca(pesquisaId);
      obrigado.current?.focus();
    }
  }, [estado.enviado, pesquisaId]);

  // Erro vindo do servidor numa pergunta: leva o foco até ela
  useEffect(() => {
    const primeira = perguntas.find((p) => estado.erros?.[p.id]);
    if (primeira) document.getElementById(`pergunta-${primeira.id}`)?.focus();
  }, [estado, perguntas]);

  function escolher(perguntaId: string, valor: string) {
    setValores((v) => ({ ...v, [perguntaId]: valor }));
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); // sem reset automático do formulário: as escolhas ficam se der erro
    // Nenhuma pergunta é obrigatória; o servidor só pede pelo menos uma resposta
    const dados = new FormData(e.currentTarget);
    // Cada token vale uma vez só: depois de enviar, pede um novo ao widget
    setToken("");
    setRodada((r) => r + 1);
    startTransition(() => acao(dados));
  }

  if (estado.enviado || jaRespondeu) {
    return (
      <section
        className={cn(
          "mt-6 flex flex-col items-center rounded-3xl bg-card p-8 text-center",
          SOMBRA_CARTAO,
          estado.enviado && "entrada",
        )}
      >
        <IconeObrigado className="size-20" />
        <h1 ref={obrigado} tabIndex={-1} className="mt-4 text-3xl font-bold outline-none">
          {estado.enviado ? "Obrigado!" : "Você já respondeu hoje. Valeu!"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Sua opinião ajuda a {empresa} a melhorar. Até a próxima!
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="mt-4 space-y-4">
      <input type="hidden" name="carimbo" value={carimbo} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="cf-turnstile-response" value={token} />
      <h1 className="text-center text-3xl font-bold tracking-tight text-balance">{titulo}</h1>

      {perguntas.map((p) => {
        const erro = erros[p.id];
        const idTitulo = `titulo-${p.id}`;
        return (
          <fieldset
            key={p.id}
            id={`pergunta-${p.id}`}
            tabIndex={-1}
            aria-describedby={erro ? `erro-${p.id}` : undefined}
            className={cn(
              "rounded-3xl bg-card p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring",
              SOMBRA_CARTAO,
              erro && "ring-2 ring-destructive",
            )}
          >
            <legend id={idTitulo} className="sr-only">
              {p.texto}
              {" (opcional)"}
            </legend>
            <p aria-hidden="true" className="text-lg font-semibold text-balance">
              {p.texto}
            </p>

            {p.tipo === "nota" && (
              <CampoNota
                id={p.id}
                valor={valores[p.id]}
                aoEscolher={(v) => escolher(p.id, v)}
                melhorar={valores[`melhorar:${p.id}`] ?? ""}
                aoEscreverMelhorar={(v) => setValores((atuais) => ({ ...atuais, [`melhorar:${p.id}`]: v }))}
              />
            )}
            {p.tipo === "texto" && (
              <textarea
                name={`texto:${p.id}`}
                aria-labelledby={idTitulo}
                value={valores[p.id] ?? ""}
                onChange={(e) => escolher(p.id, e.target.value)}
                maxLength={LIMITE_TEXTO_RESPOSTA}
                rows={3}
                placeholder="Escreva aqui, se quiser"
                className="mt-3 w-full rounded-2xl border border-input bg-transparent p-3 text-base placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
            )}

            <div role="alert">
              {erro && <p id={`erro-${p.id}`} className="mt-2 text-sm font-medium text-destructive">{erro}</p>}
            </div>
          </fieldset>
        );
      })}

      <div role="alert">
        {estado.erro && (
          <p className={cn("rounded-2xl bg-card p-4 text-center font-medium text-destructive", SOMBRA_CARTAO)}>
            {estado.erro}
          </p>
        )}
      </div>
      <WidgetTurnstile key={rodada} aoMudar={aoMudarToken} />
      <p role="status" className="min-h-5 text-center text-sm font-medium text-ameixa">
        {token ? (
          <span className="sr-only">Pronto para enviar</span>
        ) : demorou ? (
          "Não conseguimos confirmar. Verifique a conexão e recarregue a página."
        ) : (
          "Confirmando que você é uma pessoa…"
        )}
      </p>
      <Button type="submit" size="lg" disabled={pendente || !token} className="w-full">
        {pendente ? "Enviando…" : "Enviar"}
      </Button>
    </form>
  );
}

function CampoNota({
  id,
  valor,
  aoEscolher,
  melhorar,
  aoEscreverMelhorar,
}: {
  id: string;
  valor?: string;
  aoEscolher: (v: string) => void;
  melhorar: string;
  aoEscreverMelhorar: (v: string) => void;
}) {
  const nota = valor ? Number(valor) : null;
  const faixa = nota ? faixaDaNota(nota) : null;
  const pedirMelhoria = nota !== null && nota < NOTA_MINIMA_SEM_MELHORAR;
  return (
    <div className="mt-3">
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10 sm:gap-1.5">
        {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
          <label
            key={n}
            className={cn(
              "flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border-2 text-lg font-bold transition-[color,background-color,border-color,transform] duration-150 select-none active:scale-[0.97] has-focus-visible:ring-2 has-focus-visible:ring-ring",
              valor === n && faixa ? cn("border-ameixa", COR_FAIXA[faixa]) : "border-border hover:border-ameixa/40",
            )}
          >
            <input type="radio" name={`nota:${id}`} value={n} checked={valor === n} onChange={() => aoEscolher(n)} className="sr-only" />
            <span className="numeros">{n}</span>
          </label>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm text-muted-foreground">
        <span aria-hidden="true">1 = muito ruim</span>
        <p role="status" className="min-w-20 text-center text-base font-semibold text-foreground">
          {faixa ? `${nota}: ${ROTULO_FAIXA[faixa]}` : ""}
          {pedirMelhoria && <span className="sr-only">. Abaixo, um campo opcional para dizer onde podemos melhorar.</span>}
        </p>
        <span aria-hidden="true" className="text-right">
          10 = perfeito
        </span>
      </div>
      {pedirMelhoria && (
        <div className="entrada mt-3">
          <label htmlFor={`melhorar-${id}`} className="font-semibold">
            Onde podemos melhorar? <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <textarea
            id={`melhorar-${id}`}
            name={`melhorar:${id}`}
            value={melhorar}
            onChange={(e) => aoEscreverMelhorar(e.target.value)}
            maxLength={LIMITE_TEXTO_RESPOSTA}
            rows={3}
            placeholder="Conte o que não foi bom, se quiser"
            className="mt-2 w-full rounded-2xl border border-input bg-transparent p-3 text-base placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        </div>
      )}
    </div>
  );
}

