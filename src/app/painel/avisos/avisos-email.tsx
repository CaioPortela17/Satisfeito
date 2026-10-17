"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { salvarAvisos } from "./actions";

function Opcao({ id, marcada, aoMudar, titulo, ajuda }: { id: string; marcada: boolean; aoMudar: (v: boolean) => void; titulo: string; ajuda: string }) {
  return (
    <div>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
        <input id={id} type="checkbox" checked={marcada} onChange={(e) => aoMudar(e.target.checked)} aria-describedby={`${id}-ajuda`} className="mt-0.5 size-5 shrink-0 accent-ameixa" />
        <span className="font-medium">{titulo}</span>
      </label>
      <p id={`${id}-ajuda`} className="-mt-1 mb-2 pl-8 text-sm text-muted-foreground">
        {ajuda}
      </p>
    </div>
  );
}

// Cartão do painel inicial: o dono escolhe quais avisos recebe no e-mail da conta.
export function AvisosEmail({
  empresaId,
  notaBaixa,
  relatorioSemanal,
  emailAtivo,
}: {
  empresaId: string;
  notaBaixa: boolean;
  relatorioSemanal: boolean;
  emailAtivo: boolean;
}) {
  const id = useId();
  const [nota, setNota] = useState(notaBaixa);
  const [semanal, setSemanal] = useState(relatorioSemanal);
  const [pendente, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(false);

  function salvar() {
    setMensagem("");
    iniciar(async () => {
      try {
        const r = await salvarAvisos(empresaId, nota, semanal);
        setErro(Boolean(r.erro));
        setMensagem(r.erro ?? "Salvo.");
      } catch {
        setErro(true);
        setMensagem("Não deu para salvar agora. Tente de novo.");
      }
    });
  }

  return (
    <section className="entrada rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8">
      <h2 className="text-xl font-bold">Avisos por e-mail</h2>
      <p className="mt-1 text-muted-foreground">Mandamos para o e-mail da sua conta. Vale para a empresa que está aberta agora.</p>
      {!emailAtivo && (
        <p className="mt-3 rounded-2xl bg-manga-claro p-3 text-sm font-medium text-manga-texto">
          O envio de e-mails ainda não está ativado neste servidor, então nenhum aviso sai por enquanto. Você já pode deixar as opções escolhidas.
        </p>
      )}
      <div className="mt-3">
        <Opcao
          id={`${id}-nota`}
          marcada={nota}
          aoMudar={setNota}
          titulo="Avisar quando chegar uma nota baixa"
          ajuda="Também avisamos quando várias notas ruins chegam em poucos minutos. No máximo um aviso a cada 30 minutos por pesquisa."
        />
        <Opcao
          id={`${id}-semanal`}
          marcada={semanal}
          aoMudar={setSemanal}
          titulo="Receber o relatório da semana toda segunda-feira"
          ajuda="O mesmo relatório do painel, pronto para copiar e mandar à equipe. Usa IA, então fica desligado até você ligar."
        />
      </div>
      <Button type="button" className="mt-2 min-h-11" disabled={pendente} onClick={salvar}>
        {pendente ? "Salvando…" : "Salvar"}
      </Button>
      <p role="status" aria-live="polite" className={erro ? "mt-2 text-sm font-medium text-destructive" : "mt-2 text-sm text-muted-foreground"}>
        {mensagem}
      </p>
    </section>
  );
}
