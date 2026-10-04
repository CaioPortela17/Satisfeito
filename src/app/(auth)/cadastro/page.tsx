import type { Metadata } from "next";
import { FormularioCadastro } from "./formulario-cadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaCadastro() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Crie sua conta</h1>
      <p className="mt-2 mb-8 text-base text-muted-foreground">
        Em poucos minutos sua primeira pesquisa está no ar.
      </p>
      <FormularioCadastro />
    </>
  );
}
