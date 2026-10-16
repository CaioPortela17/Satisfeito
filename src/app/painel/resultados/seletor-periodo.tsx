"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DIAS_VALIDOS } from "@/lib/painel/periodo";
import type { Periodo } from "@/lib/painel/tipos";
import { cn } from "@/lib/utils";

// 7, 30 ou 90 dias. Troca pela URL (?dias=...): o servidor refaz a página com os números do período.
export function SeletorPeriodo({ atual }: { atual: Periodo }) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();

  function escolher(dias: Periodo) {
    const novos = new URLSearchParams(parametros.toString());
    novos.set("dias", String(dias));
    router.replace(`${caminho}?${novos.toString()}`);
  }

  return (
    <div>
      <p id="rotulo-periodo" className="mb-1 text-sm font-semibold">
        Período
      </p>
      <div role="group" aria-labelledby="rotulo-periodo" className="inline-flex rounded-full bg-card p-1 shadow-[0_8px_24px_rgba(42,31,45,0.08)]">
        {DIAS_VALIDOS.map((dias) => (
          <button
            key={dias}
            type="button"
            aria-pressed={dias === atual}
            onClick={() => escolher(dias)}
            className={cn(
              "min-h-11 rounded-full px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              dias === atual ? "bg-ameixa text-creme" : "text-ameixa hover:bg-muted",
            )}
          >
            {dias} dias
          </button>
        ))}
      </div>
    </div>
  );
}
