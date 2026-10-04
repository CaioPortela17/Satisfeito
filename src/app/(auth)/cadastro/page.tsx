import type { Metadata } from "next";
import { FormularioCadastro } from "./formulario-cadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaCadastro() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">Crie sua conta</h1>
      <p className="mt-1 mb-5 text-base text-muted-foreground">
        Sua primeira pesquisa no ar em minutos.
      </p>
      <FormularioCadastro />
    </>
  );
}
