"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { excluirConta } from "./actions";

// Área de "Minha conta e dados": excluir a conta. Fica dentro de um <details> fechado para não ser clicado sem querer.
export function ExcluirConta() {
  const id = useId();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  function excluir() {
    setErro("");
    iniciar(async () => {
      try {
        // Em caso de sucesso a action redireciona para o início e esta linha nem chega a rodar
        const r = await excluirConta(email);
        if (r?.erro) setErro(r.erro);
      } catch (e) {
        // O redirect do Next lança um erro especial: deixamos passar
        if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
        setErro("Não deu para excluir agora. Tente de novo em instantes.");
      }
    });
  }

  return (
    <section className="entrada rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8">
      <h2 className="text-xl font-bold">Minha conta e dados</h2>
      <details className="mt-3">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-coral-escuro underline underline-offset-4">
          Excluir minha conta
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-muted-foreground">
            Isto apaga <strong>para sempre</strong> a sua conta e tudo que é dela: empresas, pesquisas, perguntas, todas as
            respostas e os relatórios. Não dá para desfazer. Se quiser uma cópia antes, baixe a planilha na página Respostas.
          </p>
          <label htmlFor={id} className="block text-sm font-semibold">
            Para confirmar, digite o e-mail da sua conta
          </label>
          <Input id={id} type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} className="max-w-md" />
          <Button type="button" variant="destructive" className="min-h-11" disabled={pendente || email.trim().length === 0} onClick={excluir}>
            {pendente ? "Excluindo…" : "Excluir tudo e sair"}
          </Button>
          <p role="alert" className="text-sm font-medium text-destructive">
            {erro}
          </p>
        </div>
      </details>
    </section>
  );
}
