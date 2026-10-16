"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Opcao = { id: string; titulo: string };

// Troca a pesquisa pela URL (?pesquisa=...): o servidor refaz a página com os números dela.
// Os outros parâmetros (como o período, ?dias=) continuam na URL.
export function SeletorPesquisa({ opcoes, atual }: { opcoes: Opcao[]; atual: string }) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();

  function escolher(id: string) {
    const novos = new URLSearchParams(parametros.toString());
    novos.set("pesquisa", id);
    router.replace(`${caminho}?${novos.toString()}`);
  }

  return (
    <div>
      <label htmlFor="seletor-pesquisa" className="mb-1 block text-sm font-semibold">
        Pesquisa
      </label>
      <select
        id="seletor-pesquisa"
        value={atual}
        onChange={(e) => escolher(e.target.value)}
        className="min-h-12 w-full rounded-2xl border border-input bg-card px-3 text-base font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:w-auto sm:min-w-72"
      >
        {opcoes.map((o) => (
          <option key={o.id} value={o.id}>
            {o.titulo}
          </option>
        ))}
      </select>
    </div>
  );
}
