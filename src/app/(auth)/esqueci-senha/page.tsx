import type { Metadata } from "next";
import { FormularioEsqueciSenha } from "./formulario-esqueci-senha";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function PaginaEsqueciSenha() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Esqueceu a senha?</h1>
      <p className="mt-2 mb-8 text-base text-muted-foreground">
        Digite seu e-mail e enviaremos um link para você criar uma nova.
      </p>
      <FormularioEsqueciSenha />
    </>
  );
}
