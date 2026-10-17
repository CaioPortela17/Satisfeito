"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { trocarEmpresa } from "../empresas/actions";

// Troca a empresa atual do painel por esta unidade e abre os Resultados dela.
export function BotaoAbrirUnidade({ id, nome, atual }: { id: string; nome: string; atual: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");

  function abrir() {
    setErro("");
    iniciar(async () => {
      if (!atual) {
        const r = await trocarEmpresa(id);
        if (r.erro) {
          setErro(r.erro);
          return;
        }
      }
      router.push("/painel/resultados");
    });
  }

  return (
    <div>
      <Button type="button" variant="outline" className="min-h-11" disabled={pendente} onClick={abrir}>
        {pendente ? "Abrindo…" : "Ver resultados"}
        <span className="sr-only"> de {nome}</span>
      </Button>
      {erro && <p className="mt-2 text-sm font-medium text-destructive">{erro}</p>}
    </div>
  );
}
