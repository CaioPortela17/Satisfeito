import type { Metadata } from "next";
import { FormularioCadastro } from "./formulario-cadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaCadastro() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Crie sua conta</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Em poucos minutos sua primeira pesquisa está no ar.
      </p>
      <FormularioCadastro />
    </>
  );
}
