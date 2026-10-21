import type { Metadata } from "next";
import { FormularioNovaEmpresa } from "./formulario-nova-empresa";

export const metadata: Metadata = { title: "Adicionar empresa" };

export default function PaginaNovaEmpresa() {
  return (
    <div className="max-w-lg">
      <h1 className="text-3xl font-bold tracking-tight">Adicionar empresa</h1>
      <p className="mt-1 mb-6 text-ameixa">
        Cada empresa ou unidade tem suas próprias pesquisas e resultados. Você troca entre elas no
        topo do painel.
      </p>
      <section className="rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)]">
        <FormularioNovaEmpresa />
      </section>
    </div>
  );
}
