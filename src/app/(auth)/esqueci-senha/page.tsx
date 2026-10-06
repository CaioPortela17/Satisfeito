import type { Metadata } from "next";
import { FormularioEsqueciSenha } from "./formulario-esqueci-senha";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function PaginaEsqueciSenha() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">Esqueceu a senha?</h1>
      <p className="mt-1 mb-5 text-base text-muted-foreground">
        Acontece com todo mundo. Manda seu e-mail que a gente envia um link pra criar uma nova.
      </p>
      <FormularioEsqueciSenha />
    </>
  );
}
