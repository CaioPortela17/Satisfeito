"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EmpresaResumo } from "@/lib/empresas/empresa-atual";
import { cn } from "@/lib/utils";
import { trocarEmpresa } from "./empresas/actions";

// Botão no cabeçalho do painel: mostra a empresa atual e permite trocar
export function SeletorEmpresa({
  empresas,
  atualId,
}: {
  empresas: EmpresaResumo[];
  atualId: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();
  const atual = empresas.find((empresa) => empresa.id === atualId);

  function escolher(id: string) {
    if (id === atualId) return;
    setErro(undefined);
    iniciar(async () => {
      const resultado = await trocarEmpresa(id);
      if (resultado.erro) setErro(resultado.erro);
    });
  }

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="max-w-60 justify-between gap-2 bg-manga-claro text-ameixa hover:bg-manga-claro/70"
            disabled={pendente}
            aria-label={`Empresa atual: ${atual?.nome}. Trocar de empresa`}
          >
            <span className="truncate">{pendente ? "Trocando…" : atual?.nome}</span>
            <ChevronsUpDown className="size-4 shrink-0" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Suas empresas</DropdownMenuLabel>
          {empresas.map((empresa) => (
            <DropdownMenuItem key={empresa.id} onSelect={() => escolher(empresa.id)}>
              <Check
                aria-hidden="true"
                className={cn("size-4", empresa.id === atualId ? "visible" : "invisible")}
              />
              <span className="truncate">{empresa.nome}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/painel/empresas/nova">
              <Plus aria-hidden="true" className="size-4" />
              Adicionar empresa
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {erro && (
        <p role="alert" className="mt-1 text-sm font-medium text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
